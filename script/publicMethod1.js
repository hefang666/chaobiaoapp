// 获取定位
function pGetLocation(callback) {
    var bMap = api.require('bMap');
    var locationInfo = bMap.getLocation({
        accuracy: '100m',
        autoStop: true,
        filter: 1
    }, function(ret, err) {
        callback(ret, err);
    });
}

//  根据经纬度获取位置信息
function pGetNameFromCoords(callback, options = undefined) {
    var map = api.require('bMap');
    if (options != undefined) {
        map.getNameFromCoords({
            lon: options.lon,
            lat: options.lat
        }, function(ret, err) {
            if (ret.status) {
                callback(ret, err);
            }
        });
    } else {
        pGetLocation(function(ret, err) {
            map.getNameFromCoords({
                lon: ret.lon,
                lat: ret.lat
            }, function(ret, err) {
                if (ret.status) {
                    callback(ret, err);
                }
            });
        })
    }
}

// 拍照与获取图片
function pGetPicture(options = undefined, callback) {
    var type = 'camera';
    switch (true) {
        case options == null:
            type = 'camera';
            break;
        case options != null && options.type != undefined:
            type = options.type;
            break;
        default:
            type = 'camera';
            break;
    }
    var waterMark = options != undefined && options.waterMark != undefined && options.waterMark != "" && options.waterMark != null ? options.waterMark : false;
    if (type == 'camera' || type =='library') {
        api.getPicture({
            sourceType: type,
            mediaValue: 'pic',
            saveToPhotoAlbum: true,
            groupName:'综合水务平台'
        }, function(ret, err) {
            if (ret.data != "") {
                var lists = [];
                lists.push({
                    path: ret.data
                });
                if (waterMark) {
                    var markOptions = options;
                    markOptions.data = lists;
                    pAddwaterMark(markOptions, function(ret) {
                        callback(ret, err);
                    });
                } else {
                    ret.imgList = [];
                    ret.imgList.push(ret.data);
                    ret.status = true;
                    callback(ret, err);
                }

            } else {
                ret.status = false;
                callback(ret, err);
            }
        });
    } else if (type == 'pic') {
        var UIAlbumBrowser = api.require('UIAlbumBrowser');
        UIAlbumBrowser.open({
            type: 'image',
            styles: {
                bg: '#fff',
                mark: {
                    icon: '',
                    position: 'bottom_left',
                    size: 20
                },
                nav: {
                    bg: 'rgba(0,0,0,0.6)',
                    titleColor: '#fff',
                    titleSize: 18,
                    cancelColor: '#fff',
                    cancelSize: 16,
                    finishColor: '#fff',
                    finishSize: 16
                }
            },
            rotation: true
        }, function(ret, err) {
            if (ret.eventType == "confirm") {

                var lists = ret.list;
                var paths = [];
                lists.forEach(function(item, index) {
                    paths.push({
                        path: api.systemType == 'ios' ? item.thumbPath : item.path
                    })
                });
                if (waterMark) {
                    var markOptions = options;
                    markOptions.data = lists;
                    pAddwaterMark(markOptions, function(ret) {
                        callback(ret, err);
                    });
                } else {
                    ret.status = true;
                    ret.imgList = [];
                    lists.forEach(function(item) {
                        ret.imgList.push(item.path);
                    });
                    callback(ret, err);
                }
            } else {
                ret.status = false;
                callback(ret, err);
            }


        });
    } else if (type == 'video' || type == 'RecordingVideo') {
        api.getPicture({
            sourceType: type == 'video' ? 'library' : 'camera',
            mediaValue: 'video',
            saveToPhotoAlbum: true
        }, function(ret, err) {
            if (ret.data != "") {
                ret.status = true;
                callback(ret, err);
            } else {
                ret.status = false;
                callback(ret, err);
            }
        });
    }

}
// 添加水印
function pAddwaterMark(options, callback) {
    var mobilePrint = api.require('mobilePrint');
    var pictureNumber = 0;
    var imgList = [];
    var data = options.data;
    var time = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
    var waterMarkNumber = Object.keys(options.waterMarkData);
    var waterMarkJson = {
        "oldimgurl": "",
        "newimgurl": "",
        "newimgwidth": "680", //1000
        "fontnum": 0,
    };
    for (let n = 0; n < waterMarkNumber.length; n++) {
        var number = n;
        if (number == 0) {
            number = 50;
        } else {
            number = 50 + (n * 50);
        }
        waterMarkJson["font" + n + "x"] = "50";
        waterMarkJson["font" + n + "y"] = `${number}`;

        if (options.waterMarkData[waterMarkNumber[n]].length !== 0) {
            waterMarkJson.fontnum++;
            if (n == 0) {
                waterMarkJson["font" + n + "words"] = `户号:${options.waterMarkData[waterMarkNumber[n]]}  时间:${time}`;
            } else {
                waterMarkJson["font" + n + "words"] = `类型:${options.waterMarkData[waterMarkNumber[n]]}`;
            }
            waterMarkJson["font" + n + "size"] = "28";
            waterMarkJson["font" + n + "color"] = "#FF0000";
            waterMarkJson["font" + n + "style"] = "宋体";
        }

    }
    if (waterMarkJson.fontnum != 0) {
        for (let i = 0; i < data.length; i++) {
            waterMarkJson.oldimgurl = data[i].path;
            waterMarkJson.newimgurl = data[i].path;
            mobilePrint.imgPrint(waterMarkJson, function(ret) {
                if (ret.status) {
                    if (options.waterMarkNewUrl != undefined) {
                        pictureNumber++;
                        imgList.push(ret.imgurl);
                        if(pictureNumber == data.length){
                          pFsCopyFiles(imgList, options.waterMarkNewUrl, function(fsRet) {
                              if (fsRet.status) {
                                var callData =imgList;
                                var callLimgList =[];
                                var callNumber = 0;
                                   for(let n=0;n<callData.length;n++){
                                     callNumber++;
                                     var imgurl = callData[n].substring(callData[n].lastIndexOf('/') + 1, callData[n].length);
                                       callLimgList.push(options.waterMarkNewUrl + imgurl);
                                   }
                                  if (callNumber == callData.length) {
                                      var retData = {
                                          msg: '成功',
                                          status: true,
                                          imgList: []
                                      };
                                      retData.imgList = callLimgList;
                                      callback(retData)
                                  }
                              }
                          });
                        }
                    } else {
                        pictureNumber++;
                        imgList.push(ret.imgurl);
                        if (pictureNumber == data.length) {
                            var retData = {
                                msg: '成功',
                                status: true,
                                imgList: []
                            };
                            retData.imgList = imgList;
                            callback(retData)
                        }
                    }


                } else {
                    var retData = {
                        msg: '失败',
                        status: false,
                        imgList: []
                    };
                    callback(retData);
                }
            });
        }
    }

}
function unique(arr){
    var newArr = [];
    for(var i = 0; i < arr.length; i++){
        if(newArr.indexOf(arr[i]) == -1){
            newArr.push(arr[i])
        }
    }
    return newArr;
}
// 图片预览
function pBrowserPicture(index, data) {
    api.openWin({
        name: 'pictureBrowser',
        url: 'widget://html/pictureBrowser.html',
        pageParam: {
            images: data,
            index: index
        },
        animation: {
            type: "fade", //动画类型（详见动画类型常量）
            duration: 300 //动画过渡时间，默认300毫秒
        }
    });
}

function pBrowserVideo(url) { //视频播放
    api.openVideo({
        url: url
    });
}

function pGetLocationGPS(setGPS = false, callback = undefined) { //判断是否开启了gps
    var gpsmodel = api.require('gpsState');
    if (!setGPS) {
        gpsmodel.gpsstate(function(ret) {
            callback(ret);
        });
    } else {
        if (api.systemType == 'android') {
            gpsmodel.opengps();
        }
        if (api.systemType == 'ios') {
            var setJumpNew = api.require('setJumpNew');
            setJumpNew.open();
        }
    }

}

function pFsCopyFiles(data, newPath, callback) { //复制文件到fs文件中
    var fs = api.require("fs");
    var number = 0;
    var imageList =[];
    var ret = {
      status:true,
    }
    for(let i=0;i<data.length;i++){
      number++;
      fs.copyTo({
          oldPath: data[i],
          newPath: newPath
      }, function(ret, err) {

      });
      if(number == data.length){
        callback(ret);
      }
    }

}

function pNavigationAppIsExist(callback) {
    var navigator = api.require('navigator');
    var arrays = ['bMap', 'aMap', 'gMap'];
    var callArrays = [];
    var number = 0;
    for (let i = 0; i < arrays.length; i++) {
        navigator.installed({
            target: arrays[i]
        }, function(ret, err) {
            number++;
            if (ret.status) {
                callArrays.push(arrays[i]);
            }
            if (number == arrays.length) {
              if(callArrays.length == 0){
                var ret = {
                    status: false,
                    data: []
                };
              }else{
                var ret = {
                    status: true,
                    data: callArrays
                };
              }
                callback(ret);
            }
        });
    }

}

//调用导航，手动选择使用的导航地图
function pNavigation(options) {
    pNavigationAppIsExist(function(ret) {
        if (ret.status) {
            var data = ret.data;
            var buttons = [];
            var buttonsIndex = [];
            data.forEach(function(item, index) {
                switch (true) {
                    case item == 'bMap':
                        buttons.push('百度地图');
                        break;
                    case item == 'aMap':
                        buttons.push('高德地图');
                        break;
                    case item == 'gMap':
                        buttons.push('谷歌地图');
                        break;
                }
            });
            if (api.systemType == 'ios') {
                buttons.push('苹果地图');
            }
            api.actionSheet({
                buttons: buttons
            }, function(ret, err) {
                var index = ret.buttonIndex;
                if (index <= buttons.length) {
                    var name = buttons[index - 1];
                    switch (true) {
                        case name == "百度地图":
                            options.mapType = 'bMap';
                            pMapNavigation(options);
                            break;
                        case name == "高德地图":
                            options.mapType = 'aMap';
                            pMapNavigation(options);
                            break;
                        case name == "谷歌地图":
                            options.mapType = 'gMap';
                            pMapNavigation(options);
                            break;
                        case name == "苹果地图":
                            options.mapType = 'appleMap';
                            pMapNavigation(options);
                            break;
                    }
                }
            });
        }else {
          api.toast({
              msg: '请先安装第三方地图，例如百度地图,高德地图等',
              duration: 2000,
              location: 'top'
          });

        }
    })
}

// 打开地图导航
function pMapNavigation(options) {
    var options = options;
    if (options.endLon == undefined || options.endLon == '') {
        api.toast({
            msg: '终点坐标不能为空',
            duration: 2000,
            location: 'top'
        });
        return
    }
    if (options.endAddreesName == "") {
        pGetNameFromCoords(function(ret, err) {
            if (ret.status) {
                options.endAddreesName = ret.address;
            } else {
                options.endAddreesName = "";
            }
        }, {
            lon: options.endLon,
            lat: options.endLat
        })
    }
    if (options.startLon == undefined || options.startLon == "") {
        pGetNameFromCoords(function(ret, err) {
            if (ret.status) {
                options.startLon = ret.lon;
                options.startLat = ret.lat;
                options.startAddreesName = ret.address;
                pOpenMapnavigation(options);
            } else {
                api.toast({
                    msg: '当前位置定位失败',
                    duration: 2000,
                    location: 'top'
                });
                return
            }
        })
    } else {
        pOpenMapnavigation(options);
    }
}

function pOpenMapnavigation(options) {
    var navigator = api.require('navigator');
    var start = { // 起点信息.
        lon: options.startLon, // 经度.
        lat: options.startLat, // 纬度.
        name: options.startAddreesName
    }
    var end = { // 起点信息.
        lon: options.endLon, // 经度.
        lat: options.endLat, // 纬度.
        name: options.endAddreesName
    }
    if (options.mapType != 'appleMap') {
        navigator.installed({
            target: options.mapType
        }, function(ret, err) {
            if (ret.status) {
                switch (true) {
                    case options.mapType == "bMap":
                        //百度地图导航
                        navigator.bMapNavigation({
                            start: start,
                            end: end,
                            mode: 'driving'
                        });
                        break;
                    case options.mapType == "aMap":
                        // 高德地图导航
                        navigator.aMapPath({
                            start: start,
                            end: end,
                            mode: 'driving',
                        });
                        break;
                    case options.mapType == "gMap":
                        var newStart = JSON.parse(JSON.stringify(start).replace(/name/g, 'addr'));
                        var newEnd = JSON.parse(JSON.stringify(end).replace(/name/g, 'addr'));
                        navigator.gMapNavigation({
                            start: newStart,
                            end: newEnd,
                            mode: 'driving'
                        });
                        break;
                }
            } else {
                switch (true) {
                    case options.mapType == "bMap":
                        var mapName = '百度';
                        break;
                    case options.mapType == "aMap":
                        var mapName = '高德';
                        break;
                    case options.mapType == "gMap":
                        var mapName = '谷歌';
                        break;
                }
                api.toast({
                    msg: '当前手机未安装' + mapName + '地图，无法进行' + mapName + '地图导航',
                    duration: 2000,
                    location: 'bottom'
                });
            }
        });
    } else {
        // 苹果自身导航
        navigator.appleNavigation({
            start: start,
            end: end,
            mode: 'driving'
        });
    }
}


// 修改任务列表我的任务状态  （提交到本地修改状态为已保存）
function pUpdataMytaskSheetsStatus(item){
     if(item.taskId == undefined){
       item.taskId = item.taskCode; //20200820 21:21
     }
     if(item.userName == undefined){
       item.userName =$api.getStorage('loginData').userName;
     }
  var db = api.require("db");
  db.selectSql({
      name: 'Wsdatabase',
      sql: 'SELECT * FROM myTaskSheet where taskId ="'+item.taskId+'" and userName ="'+item.userName+'"'
  }, function(ret, err){
      if( ret.status ){
          if(ret.data.length !=0){
            db.executeSql({
                name: 'Wsdatabase',
                sql: 'UPDATE myTaskSheet SET statusFlagText="已保存",isSaveLocal=1 where taskId ="'+item.taskId+'" and userName ="'+item.userName+'"'
            }, function(ret, err){
                if( ret.status ){
                    // alert( JSON.stringify( ret ) );
                }else{
                    // alert( JSON.stringify( err ) );
                }
            });

          }
      }
  });
}
