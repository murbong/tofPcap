import capa from 'cap';
const { Cap, decoders } = capa;

import appRoot from 'app-root-path'; // root 경로를 가져오기 위해 사용

import { writeFileSync,readFileSync } from 'fs';

import readlineSync from 'readline-sync';

import cron from 'node-cron';

import notifier from 'node-notifier'

const { PROTOCOL } = decoders;

let c = new Cap();

let alertArray = JSON.parse(readFileSync('./alert.json','utf-8'));
console.log(alertArray.length)


let deviceList = Cap.deviceList();

console.log(deviceList.map((device, index) => `${index}. ${device.name} : ${device.description} ${device.addresses.map(e => e.addr)}`).join('\n'));


let number = readlineSync.question("select device number : ");

if (deviceList.length <= number) {
    process.exit();
}
console.log(deviceList[number].addresses[1]);

let device = Cap.findDevice(deviceList[number].addresses[1].addr);
let filter = "tcp and src host 8.213.130.139"; // ht2.pwrdoverseagame.com //ht6.pwrdoverseagame.com

let bufSize = 10 * 1024 * 1024;
let buf = Buffer.alloc(65535);

let linkType = c.open(device, filter, bufSize, buf);

let checksumDic = {};

const chatClassDic = {
    1: '세계',
    2: '2번',
    4: '팀',
    8: '8번',
    16: '16번',
    32: '32번',
    64: '모집',
    128: '길드',
}

c.setMinBytes && c.setMinBytes(0);

c.on("packet", function (nbytes, trunc) {
    //console.log('packet: length ' + nbytes + ' bytes, truncated? '+ (trunc ? 'yes' : 'no'));

    if (linkType === "ETHERNET") {
        let ret = decoders.Ethernet(buf);

        if (ret.info.type === PROTOCOL.ETHERNET.IPV4) {
            //console.log('Decoding IPv4 ...');

            ret = decoders.IPV4(buf, ret.offset);
            //console.log('from: ' + ret.info.srcaddr + ' to ' + ret.info.dstaddr);

            if (ret.info.protocol === PROTOCOL.IP.TCP) {
                let datalen = ret.info.totallen - ret.hdrlen;
                let offset = 0;
                //console.log('Decoding TCP ...');

                ret = decoders.TCP(buf, ret.offset);

                //console.log(' from port: ' + ret.info.srcport + ' to port: ' + ret.info.dstport);
                datalen -= ret.hdrlen;
                try {

                    // let newBuf = Buffer.from(buf.subarray(ret.offset, datalen));
                    // 불변진리
                    var len1 = buf.readUInt32LE(ret.offset + offset);
                    var length = buf.readUInt32LE(ret.offset + offset + 4);

                    if(len1 != datalen-4)return;

                    offset += 8;//4+4

                    offset += length;
                    offset += 4;

                    var len2 = buf.readUInt32LE(ret.offset + offset);
                    var length = buf.readUInt32LE(ret.offset + offset + 4);
                    
                    offset += 8;//4+4

                    offset += length;
                    offset += 4;

                    let Flag = buf.readUint32LE(ret.offset + offset);

                    offset += 4;

                    if (Flag === 0x6A9) { // 채팅

                        offset += 4; // 그다음 length 구하기
                        var len = buf.readUint32LE(ret.offset + offset);
                        offset += 4;
                        offset += len;

                        let chatID = buf.readUint32LE(ret.offset + offset); // 길드챗, 팀챗, 세계챗 뭘까용~~~
                        offset += 4;

                        offset += 0x10;

                        let chatClass = buf.readUint32LE(ret.offset + offset);

                        offset += 4;

                        len = buf.readUint32LE(ret.offset + offset);
                        offset += 4;
                        offset += len;
                        offset += 4;

                        var [message, length] = buf.readString(ret.offset + offset);
                        offset += 4;
                        offset += length;

                        var [checksum, length] = buf.readString(ret.offset + offset);
                        offset += 4;
                        offset += length;

                        var [level, length] = buf.readString(ret.offset + offset); // 모집시 적정 레벨
                        offset += 4;

                        offset += length;

                        offset += 0x1a; // 아직 잘 모르겠으니 건너뜀


                        var length = buf.readUint16LE(ret.offset + offset); // 여기도 뭔지 잘 모르겠음
                        offset += 2;

                        offset+=8;

                        var playerLevel = buf.readUint32LE(ret.offset + offset);

                        offset += length-8;

                        var length = buf.readUint32LE(ret.offset + offset); // 캐릭터 클래스 정보?

                        offset += 4;

                        var uid = buf.readInt32LE(ret.offset + offset);
                        offset += 4;
                        var server = buf.readInt32LE(ret.offset + offset);
                        offset += 4;
                        //var whatis = buf.toString('hex', ret.offset + offset, ret.offset + offset + length - 4);
                        //console.log(whatis)
                        offset += length - 0x10 - 8;

                        var [suppressor, length] = buf.readString(ret.offset + offset); // 서프레서
                        offset += 4;
                        offset += length;

                        offset += 8; // 8바이트 건너뜀 추후 수정 예상

                        var [avatarframe, length] = buf.readString(ret.offset + offset); // 프레임
                        offset += 4;
                        offset += length;

                        var [avatar, length] = buf.readString(ret.offset + offset); // 아바타
                        offset += 4;
                        offset += length;

                        var [chatbubble, length] = buf.readString(ret.offset + offset); // 버블
                        offset += 4;
                        offset += length;

                        var [title, length] = buf.readString(ret.offset + offset); // 타이틀
                        offset += 4;
                        offset += length;

                        var [nickname, length] = buf.readString(ret.offset + offset); // 타이틀
                        offset += 4;
                        offset += length;

                        if (checksumDic[checksum] == null) {

                            checksumDic[checksum] = true;

                            if(alertArray.some(alert=>message.includes(alert))){
                                notifier.notify({
                                    appID:"kekboom.kawaii",
                                    title: "타워 오브 판타지",
                                    message: `${nickname} : ${message.replace(/<[^>]*>/g, "")}`,
                                    sound:true,
                                  })
                            }

                            console.log(`${new Date().toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: 'numeric',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                               })} | [${chatClassDic[chatClass]}](${suppressor})(uid:${server}${uid})(${playerLevel})${nickname} : ${message.replace(/<[^>]*>/g, "")}`)

                            console.log(`Frame : ${avatarframe}`);

                            console.log(`Avatar : ${avatar}`);

                            console.log(`chatBubble : ${chatbubble}`);

                            console.log(`Title : ${title}`);

                            console.log(`chatID : ${chatID}`);

                            console.log("==============================")
                        }


                    }
                    else if (Flag === 0x140) { // 사람 정보 불러오기

                    }
                    else if(Flag === 0x7D0){ // 간략한 정보 불러오기
 
                    }
                    else {
                    }
                }
                catch (e) {

                    console.error(e);

                    let str = buf.toString("hex", ret.offset, ret.offset + datalen);
                    if (str.length > 0) {

                        console.log(`오류 발생 ${appRoot}/log/${Date.now()}.log`)
                        writeFileSync(`${appRoot}/log/${Date.now()}.log`, str);
                    }
                }

            } else if (ret.info.protocol === PROTOCOL.IP.UDP) {
                console.log("Decoding UDP ...");

                ret = decoders.UDP(buf, ret.offset);
                console.log(
                    " from port: " + ret.info.srcport + " to port: " + ret.info.dstport
                );
                console.log(
                    buf.toString("utf-8", ret.offset, ret.offset + ret.info.length)
                );
            } else
                console.log(
                    "Unsupported IPv4 protocol: " + PROTOCOL.IP[ret.info.protocol]
                );
        } else
            console.log("Unsupported Ethertype: " + PROTOCOL.ETHERNET[ret.info.type]);
    }
});

function TCPAssembly(buffer, size){

}

cron.schedule('*/1 * * * *', function () {
    // 10분마다 초기화
    checksumDic = {};
});

/**
 * 
 * @param {*} offset Current Offset
 * @returns string, length array
 */
Buffer.prototype.readString = function (offset) {

    let length = this.readInt32LE(offset);
    offset += 4;
    let string = this.toString("utf-8", offset, offset + length);

    return [string, roundToNext(length + 1, 4)]
};

function roundToNext(n, a) {
    return Math.ceil(n / a) * a;
}