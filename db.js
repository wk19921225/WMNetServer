var mysql = require('mysql');
var util = require('./util');
module.exports = {
  createCon(item){
    let items = {
      that: this
    };
    const connection = mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '123456',
      database: 'WM'
    });
    connection.connect();
    Object.assign(items,item,{connection});
    return new Promise(function (resolve) {
      if (items.turb.toFixed(2) >= 0 && items.dissolvedOxygen.toFixed(2) >= 0 && items.cond.toFixed(2) >= 0 && items.ph >= 0 && items.cod >= 0 && items.temper >= 0) {
        items.connection.query('INSERT INTO waterPara (deviceId,time,turb,dissolvedOxygen,cond,ph,cod,temper) VALUES (' + items.serialNumber + ',' + items.date + ',' + items.turb.toFixed(2) + ',' + items.dissolvedOxygen.toFixed(2) + ',' + items.cond.toFixed(2) + ',' + items.ph + ',' + items.cod + ',' + items.temper + ')', function (err) {
          if (err) {
            console('写入数据出错')
          } else {
            resolve(items)
          }
        });
      }
    })
  },
  verifyPumpStatus(items){
    return new Promise(function (resolve) {
      items.connection.query('SELECT enterPumpStatus,outPumpStatus FROM pumpStatus where deviceId='+parseInt(items.serialNumber)+' AND id in (SELECT max(id) FROM pumpStatus WHERE deviceId='+parseInt(items.serialNumber)+')',function (err,rows) {
        if(err){
          console.log('验证状态表出错')
        }else {
          //console.log(rows[0].id)
          let enterPumpStatus = Boolean(rows[0].enterPumpStatus);
          let outPumpStatus = Boolean(rows[0].outPumpStatus);
            Object.assign(items,{enterPumpStatus,outPumpStatus});
            resolve(items)
        }
      });
    })

  },
  verifyPumpControl(items){
    return new Promise(function (resolve) {
      items.connection.query('SELECT enterPumpControl,outPumpControl FROM pumpControl where deviceId='+parseInt(items.serialNumber)+' AND id in (SELECT max(id) FROM pumpControl WHERE deviceId='+parseInt(items.serialNumber)+')',function (err,rows) {
        if(err){
          console.log('验证控制表出错')
        }else {
          //console.log(rows[0].id)
          let enterPumpControl = Boolean(rows[0].enterPumpControl);
          let outPumpControl = Boolean(rows[0].outPumpControl);
            Object.assign(items,{enterPumpControl,outPumpControl});
            //console.log(items.that);
            resolve(items,items.that.updatePumpStatus,items.that.updatePumpControl,items.that.controlPump)
        }
      });
    })
  },
  verifyTotalItem(totalItem,updatePumpStatus,updatePumpControl,controlPump){
    return new Promise(function () {
      console.log('当前硬件状态入水'+totalItem.enterPump+'出水'+totalItem.outPump+',控制表入水'+totalItem.enterPumpControl+'出水'+totalItem.outPumpControl+',数据表入水'+totalItem.enterPumpStatus+'出水'+totalItem.outPumpStatus);
     let hard = {
       enterPump:Boolean(totalItem.enterPump),
       outPump:Boolean(totalItem.outPump),
     };
     let status = {
       enterPump:Boolean(totalItem.enterPumpStatus),
       outPump:Boolean(totalItem.outPumpStatus),
     };
      let control = {
        enterPump:Boolean(totalItem.enterPumpControl),
        outPump:Boolean(totalItem.outPumpControl),
      };
      if(util.compareObj(hard,status) && util.compareObj(hard,control)){//1=2,1=3
        //不做任何操作
        console.log('不做任何操作')
      }else if (util.compareObj(hard,status) && !util.compareObj(hard,control)){//1=2,1!=3
        //需要远程控制,  //console.log(totalItem.client)
        console.log('远程控制');
        controlPump(totalItem)
      }else if (!util.compareObj(hard,status) ){//1!=2,2=3或者1!=2,2!=3
        //自动控制,同步状态表与控制表, status=0表示自动控制
        Object.assign(totalItem,{ControlStatus: false});
        if(util.compareObj(hard,control)){
          console.log("远程控制完成,更新状态表");
          updatePumpStatus(totalItem)
        }else {
          console.log('同步状态表,控制表');
          updatePumpStatus(totalItem).then(function (totalItem) {
            updatePumpControl(totalItem)
          })
        }
      }
    })
  },
  updatePumpStatus (item) {
    return new Promise(function (resolve,reject) {
      item.connection.query('INSERT INTO pumpStatus (deviceId,time,enterPumpStatus,outPumpStatus) VALUES ('+item.serialNumber+ ','  + item.date + ',' + item.enterPump + ',' + item.outPump + ')',function (err) {
        if(err){
          console.log('更新状态表出错')
        }else{
          console.log('完成状态表更新')
          resolve(item)
        }
      })
    })

  },
  updatePumpControl (item) {
    return new Promise(function () {
      item.connection.query('INSERT INTO pumpControl (deviceId,time,enterPumpControl,outPumpControl,status) VALUES ('+item.serialNumber+ ','  + item.date + ',' + item.enterPump + ',' + item.outPump + ','+ item.ControlStatus +')',function (err) {
        if(err){
          console.log('更新控制表出错')
        }else{
          console.log('完成控制表更新')
        }
      })
    })

},
 controlPump (item) {
    //实际控制0表示开启  1表示关闭,所以取反
  const buf = new Buffer([0x01,!item.enterPumpControl,0x01,!item.outPumpControl]);
  item.client.write(buf);
}
};



