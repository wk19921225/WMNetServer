var mysql = require('mysql');
module.exports = {
  createCon(item){
    const connection = mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '123456',
      database: 'WM'
    });
    connection.connect();
    return new Promise(function (resolve,reject) {
      let Error = '数据库连接错误';
      resolve (connection,item);
      reject(Error)
    })
  },
  writeWMData(connection,item){
    if (item.turb.toFixed(2) !== NaN && item.dissolvedOxygen.toFixed(2) !== NaN && item.cond.toFixed(2) !== NaN && item.ph !== NaN && item.cod !== NaN && item.temper !== NaN) {
       connection.query('INSERT INTO waterPara (deviceId,time,turb,dissolvedOxygen,cond,ph,cod,temper) VALUES ('+item.serialNumber+ ','  + item.date + ',' + item.turb.toFixed(2) + ',' + item.dissolvedOxygen.toFixed(2) + ',' + item.cond.toFixed(2) + ',' + item.ph + ',' + item.cod + ',' + item.temper + ')', function (err) {
         if (err) throw err;
          });
    }
    return new Promise(function (resolve,reject) {
      let Error = "写入数据出错";
      resolve(connection,item);
      reject(Error)
    })
  },
  findId(connection,item){
    let id;
    connection.query('SELECT id FROM pumpStatus where deviceId='+parseInt(item.serialNumber)+' AND time in (SELECT max(time) FROM pumpStatus WHERE deviceId='+parseInt(item.serialNumber)+')',function (err,rows) {
      if(err){
        throw err
      }else {
        //console.log(rows[0].id)
        id = rows[0].id;
      }
    });
    return new Promise(function (resolve,reject) {
      let Error = "获取最新 id 出错"
      resolve(connection,item,id);
      reject(Error)
    })
  },
  readPumpStatus(connection,item,id){
    let status = false;
    let enterPumpStatus,outPumpStatus;
      connection.query('SELECT enterPumpStatus,outPumpStatus FROM pumpStatus where id='+id+';',function (err,rows) {
        if(err){
          console.log(err)
        }else{
          //console.log(rows[0].enterPumpStatus);
          //console.log(rows[0].outPumpStatus)
          if((item.enterPump == rows[0].enterPumpStatus)&&(item.outPump == rows[0].outPumpStatus)){
            console.log('水泵状态与数据库一致,无需更新');
          }else{
            enterPumpStatus = item.enterPump;
            outPumpStatus = item.outPump
            status = true;
          }
        }
      });
    if (status){
      console.log('更新水泵状态')
      connection.query('INSERT INTO pumpStatus (deviceId,time,enterPumpStatus,outPumpStatus) VALUES ('+item.serialNumber+ ','  + item.date + ',' + enterPumpStatus + ',' + outPumpStatus + ')',function (err) {
        if(err){
          throw err;
        }else {
          status = false;//关闭写入开关,等待下次开启
        }
      });
    }
  }
  /*,
  updatePumpStatus(connection,item){
    console.log('更新水泵状态')
    connection.query('INSERT INTO pumpStatus (deviceId,time,enterPumpStatus,outPumpStatus) VALUES ('+item.serialNumber+ ','  + item.date + ',' + enterPumpStatus + ',' + outPumpStatus + ')',function (err) {
      if(err){
        throw err;
      }else {
        status = false;//关闭写入开关,等待下次开启
      }
    });
    connection.end()
  }*/
};






