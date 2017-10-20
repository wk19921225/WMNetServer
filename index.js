
const db = require('./db');
const net = require('net');          //引入net模块
const ChatSever =  net.createServer(); //net.createSever()方法建立chatsever
ChatSever.on("connection",function (client) {
    console.log("connected...");
     // const buf = new Buffer([0x01, 0x01,0x01,0x01]);//四位，1为进水电机参数控制位，2为进水电机状态位，3为出水电机参数控制位，4为出水电机状态位
     // client.write(buf);
    client.on("data",function (data) {
        var hexNumber = [];
        var date = new Date().getTime();
        for (var i = 0; i < data.length; i++) {
            hexNumber.push(data[i].toString(16));
        }
        const pumpStatus = parseInt(hexNumber.pop(),10);
      let enterPump;
      let outPump;
        if(pumpStatus === 0){
           enterPump = true;
           outPump = true;
            console.log("入水电机启动  出水电机启动");
        } else if(pumpStatus === 1){
           enterPump =  false;
           outPump = true;
            console.log("入水点击关闭  出水电机启动");
        }else if(pumpStatus === 2){
           enterPump = true;
           outPump = false;
            console.log("入水点击启动  出水电机关闭");
        }else{
           enterPump = false;
           outPump = false;
            console.log("入水点击关闭  出水电机关闭");
        }

        var serial = hexNumber.slice(0, 2).map(function (value) {
            var value =  parseInt(value,16)<10?"0"+parseInt(value,16):parseInt(value,16);
            return value;
        })
        var serialNumber = serial.join('');//设备串号
        var doubleNumber = hexNumber.slice(2, 18);//双字单精度浮点型
        var oneNumber = hexNumber.slice(18);//word型数字
        function exchangeNumber(arr) {  //切换高地位8位
            for (var i = 0; i < arr.length; i++) {
                if (i % 2 == 0) {
                    var temp = arr[i + 1];
                    arr[i + 1] = arr[i];
                    arr[i] = temp;
                }
            }
            return arr;
        }

        function getDoubleNumber(arr) {
            var newArr = [];
            for (var i = 0; i < 4; i++) {
                var tempArr = [];
                for (var j = 0; j < 4; j++) {
                    var tempStr = arr.shift();
                    var temNum = parseInt(tempStr, 16);
                    tempArr[j] = temNum == 0 ? "00" : temNum < 16 ? "0" + temNum.toString(16) : temNum.toString(16);
                }
                newArr[i] = tempArr.join("");
            }
            return newArr;
        }

        function getOneNumber(arr) {
            var newArr = [];
            //console.log(arr);  [ '1', 'c', '2', 'ad', '80', '0' ]
            for (var i = 0; i < 3; i++) {
                var tempArr = [];
                for (var j = 0; j < 2; j++) {
                    var tempStr = arr.shift();
                    temNum = parseInt(tempStr, 16);
                    // console.log(temNum);
                    tempArr[j] = temNum == 0 ? "00" : temNum < 16 ? "0" + temNum.toString(16) : temNum.toString(16);//末尾00会被清除，需要手动加上。
                    // tempNum=arr.shift()!=0?:"00";
                }
                newArr[i] = tempArr.join("");
            }
            return newArr;
        }

        function binToDec(index, arr) {
            var integer = 0;
            var decimals = 0;
            for (var i = index - 1, n = 0; i >= 0; i--) {
                integer += arr[i] * Math.pow(2, n++);

            }
            for (var j = index + 1, m = -1; j < arr.length; j++) {
                decimals += arr[j] * Math.pow(2, m--);

            }
            return integer + decimals;
        }

        function floatHexTODec(num) {
            var arr = [];
            if (parseInt(num, 16) != 0) {
                var str = parseInt(num, 16).toString(2);
                arr = str.split("");
                if (arr.length < 32) {

                    arr.unshift("0");
                }
                var symbol = arr.slice(0, 1);
                var exponent = arr.slice(1, 9);
                var end = arr.slice(9);
                end.unshift("1");
                var e = parseInt(exponent.join(""), 2) - 127;
                end.splice(e + 1, 0, ".");
                var final = binToDec(e + 1, end);
                return final;
            }
            else {
                return 0;
            }
        }

        doubleNumber = exchangeNumber(doubleNumber);//整理双字数据，每两位交换
        oneNumber = exchangeNumber(oneNumber);
        var doubleHEX = getDoubleNumber(doubleNumber);
        var oneHEX = getOneNumber(oneNumber);
        var cond = floatHexTODec(doubleHEX[0]);
        var turb = floatHexTODec(doubleHEX[1]);
        var solid = floatHexTODec(doubleHEX[2]);
        var dissolvedOxygen = floatHexTODec(doubleHEX[3]);
        var temper = parseInt(oneHEX[0], 16) / 10;
        var ph = parseInt(oneHEX[1], 16) / 100;
        var cod = parseInt(oneHEX[2], 16) > 20001 ? 0 : parseInt(oneHEX[2], 16) / 32;
        //console.log(cond);
        //console.log(turb);
        // console.log(solid);
        // console.log(dissolvedOxygen);
        // console.log(temper);
        // console.log(ph);
        //  console.log(cod);

        console.log("设备串码 : " + serialNumber + " 时间戳 : " + date + " 水温 :" + temper + "摄氏度 " + " 电导率 :" + cond.toFixed(2) + "uS/cm " + " 浊度 : " + turb.toFixed(2) + "NTU " + " 固体悬浮物 : " + solid + "mgL" + " 溶解氧 : " + dissolvedOxygen.toFixed(2) + "mg/L " + " PH : " + ph);
    let item = {
      serialNumber,date,turb,dissolvedOxygen,cond,ph,cod,temper,enterPump,outPump,client
    };

    db.createCon(item)
      .then(function (items) {
        return db.verifyPumpStatus(items)
      })
      .then(function (items) {
        return db.verifyPumpControl(items)
      })
      .then(function (totalItem) {
        return db.verifyTotalItem(totalItem,totalItem.that.updatePumpStatus,totalItem.that.updatePumpControl,totalItem.that.controlPump)
      })
    })
})//"属性"一般用双引号
ChatSever.listen(9000,"172.17.173.170");   //node监听放在最下面
console.log("sever is running 9000 \n waiting...");
