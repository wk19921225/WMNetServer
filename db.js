var mysql = require('mysql');

module.exports = {
  createCon(item){
    console.log('启动数据库连接')
    const connection = mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '123456',
      database: 'WM'
    });
    connection.connect();
    Object.assign(item,{connection});
    return new Promise(function (resolve,reject) {
      let Error = '数据库连接错误';
      resolve (item);
      reject(Error)
    })
  },
  writeWMData(item){
    console.log('写入测量数据');
    if (item.turb.toFixed(2) !== NaN && item.dissolvedOxygen.toFixed(2) !== NaN && item.cond.toFixed(2) !== NaN && item.ph !== NaN && item.cod !== NaN && item.temper !== NaN) {
      item.connection.query('INSERT INTO waterPara (deviceId,time,turb,dissolvedOxygen,cond,ph,cod,temper) VALUES ('+item.serialNumber+ ','  + item.date + ',' + item.turb.toFixed(2) + ',' + item.dissolvedOxygen.toFixed(2) + ',' + item.cond.toFixed(2) + ',' + item.ph + ',' + item.cod + ',' + item.temper + ')', function (err) {
         if (err){throw err;}else{console.log('写入测量数据完成')}
          });
    }
    return new Promise(function (resolve,reject) {
      let Error = "写入数据出错";
      resolve(item);
      reject(Error)
    })
  },
  findId(item,readPumpStatus,updatePumpStatus){
    let totalItem = {};
    console.log('查询水泵最新状态id')
    item.connection.query('SELECT id FROM pumpStatus where deviceId='+parseInt(item.serialNumber)+' AND time in (SELECT max(time) FROM pumpStatus WHERE deviceId='+parseInt(item.serialNumber)+')',function (err,rows) {
      if(err){
        throw err
      }else {
        console.log('id 查询结果' + rows[0].id);
        if(rows[0].id){
          Object.assign(totalItem,item,{id: rows[0].id});
          readPumpStatus(totalItem,updatePumpStatus)
        }
      }
    });
  },
  readPumpStatus(totalItem,updatePumpStatus){
    console.log("判断是否更新水泵信息")
    let enterPumpStatus,outPumpStatus;
    totalItem.connection.query('SELECT enterPumpStatus,outPumpStatus FROM pumpStatus where id='+totalItem.id+';',function (err,rows) {
        if(err){
          console.log(err)
        }else{
          //console.log(rows[0].enterPumpStatus);
          //console.log(rows[0].outPumpStatus)
          console.log('已获得数据库水泵状态,入水:'+rows[0].enterPumpStatus+'出水:'+rows[0].outPumpStatus);
          if((totalItem.enterPump == rows[0].enterPumpStatus)&&(totalItem.outPump == rows[0].outPumpStatus)){
            console.log('水泵状态与数据库一致,无需更新');
          }else{
            enterPumpStatus = totalItem.enterPump;
            outPumpStatus = totalItem.outPump;
            updatePumpStatus(totalItem,enterPumpStatus,outPumpStatus)
          }
        }
      });
  },
  updatePumpStatus(totalItem,enterPumpStatus,outPumpStatus){
    console.log('更新水泵状态')
    totalItem.connection.query('INSERT INTO pumpStatus (deviceId,time,enterPumpStatus,outPumpStatus) VALUES ('+totalItem.serialNumber+ ','  + totalItem.date + ',' + enterPumpStatus + ',' + outPumpStatus + ')',function (err) {
      if(err){
        throw err;
      }
    });
    totalItem.connection.end()
  }
};






