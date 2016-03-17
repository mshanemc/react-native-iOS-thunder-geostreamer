/*
 * Copyright (c) 2015, salesforce.com, inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided
 * that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice, this list of conditions and the
 * following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and
 * the following disclaimer in the documentation and/or other materials provided with the distribution.
 *
 * Neither the name of salesforce.com, inc. nor the names of its contributors may be used to endorse or
 * promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

var React = require('react-native');
var {
    AppRegistry,
    StyleSheet,
    Text,
    View,
    ListView,
    PixelRatio,
    NavigatorIOS
} = React;
var {
    Accelerometer,
    Gyroscope,
    Magnetometer
} = require('NativeModules');
var {
  DeviceEventEmitter // will emit events that you can listen to
} = React;

var forceClient = require('./react.force.net.js');

var config = {
  //all changes are POSTed to this URL
  endpoint: 'some endpoint',
  //authorization Bearer + [this token]
  token: 'your token here',
  //some unique indentifier that could be your partition key; it's a user or device
  userId: '1'
}

var App = React.createClass({
    render: function() {
        return (
            <NavigatorIOS
                style={styles.container}
                initialRoute={{
                    title: 'IoT GeoStreamer',
                    component: mainThing,
                }}
            />
        );
    }
});


var mainThing = React.createClass({  
  //if we don't have any data, we need some kinda state

  getInitialState: function() {
    return {
      lat: 'unknown',
      long: 'unknown',
      altitude: 'unkown',
      speed: 'unknown',
      accelLast: {
        acceleration: {
          x: 0,
          y: 0,
          z: 0
        }
      },
      accelLastTS: 'unknown'
    };
  },

  componentDidMount: function() {
    var self = this;

    console.log("I mounted!");
      //initialize the geoListener
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.applyData(position);
      },
      (error) => console.log(error.message),
      {enableHighAccuracy: true, timeout: 10000, maximumAge: 1000}
    );

    Accelerometer.setAccelerometerUpdateInterval(1); // in seconds

    DeviceEventEmitter.addListener('AccelerationData', function (data) {
      
      if (self.applyAccel(data)){

        //would love to get rid of this repetitive code!
        navigator.geolocation.getCurrentPosition(
          (position) => {
            self.applyData(position);
          },
          (error) => console.log(error.message),
          {enableHighAccuracy: true, timeout: 10000, maximumAge: 1000}
        ); 
      }
    });
    //let's start getting data!
    Accelerometer.startAccelerometerUpdates()
  },

  applyAccel: function (data){
    const places = 1;

    //round It!
    data.acceleration.x = data.acceleration.x.toFixed(places);
    data.acceleration.y = data.acceleration.y.toFixed(places);
    data.acceleration.z = data.acceleration.z.toFixed(places);

    if (
      data.acceleration.x != this.state.accelLast.acceleration.x ||
      data.acceleration.y != this.state.accelLast.acceleration.y ||
      data.acceleration.z != this.state.accelLast.acceleration.z
    ){
      //it's different!
      //console.log('accel change detected');
      //var accelLast = data;
      this.setState({accelLast: data});

      //displays the last Accel timestamp
      //var accelLastTS = new Date().toString();
      this.setState({accelLastTS: Date().toString()});
      return true;
    } else {return false;}
  },

  applyData : function(position) {
    //console.log('applying data change');
    //console.log(position);

    var lat = position.coords.latitude;
    var long = position.coords.longitude;
    var altitude = position.coords.altitude;
    var speed = position.coords.speed;


    this.setState({lat});
    this.setState({long});
    this.setState({altitude});
    this.setState({speed});

    //lot it somewhere
    fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + config.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: config.userId,
        location: position,
        accel: this.state.accelLast
      })
    })
    .then((response) => response.text())
    .then((responseText) => {
      //console.log(responseText);
    })
    .catch((error) => {console.log(error);});
  },

  //cleanup your mess after you're done
  componentWillUnmount: function() {
    Accelerometer.stopAccelerometerUpdates();
  },

  render: function() {
    return (
      <View style={styles.view}>        
          <Text style={styles.title}>Current position: </Text>

          <Text>Lat: {this.state.lat}</Text>
          <Text>Long: {this.state.long}</Text>
          <Text>LastAccel: {this.state.accelLastTS}</Text>

          <Text>x: {this.state.accelLast.acceleration.x}</Text>
          <Text>y: {this.state.accelLast.acceleration.y}</Text>
          <Text>z: {this.state.accelLast.acceleration.z}</Text>
          
      </View>
    );
  }
})
/*
var UserList = React.createClass({
    getInitialState: function() {
      var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
      return {
          dataSource: ds.cloneWithRows([]),
      };
    },
    
    componentDidMount: function() {
        var that = this;
        var soql = 'SELECT Id, Name FROM User LIMIT 10';
        forceClient.query(soql,
                          function(response) {
                              var users = response.records;
                              var data = [];
                              for (var i in users) {
                                  data.push(users[i]["Name"]);
                              }

                              that.setState({
                                  dataSource: that.getDataSource(data),
                              });

                          });
    },

    getDataSource: function(users: Array<any>): ListViewDataSource {
        return this.state.dataSource.cloneWithRows(users);
    },

    render: function() {
        return (
            <ListView
              dataSource={this.state.dataSource}
              renderRow={this.renderRow} />
      );
    },

    renderRow: function(rowData: Object) {
        return (
                <View>
                    <View style={styles.row}>
                      <Text numberOfLines={1}>
                       {rowData}
                      </Text>
                    </View>
                    <View style={styles.cellBorder} />
                </View>
        );
    }
});
*/
var styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    view: {
      marginTop:80,
    },
    title: {
      fontWeight:'500',
    },
    header: {
        height: 50,
        alignItems:'center'
    },
    cellBorder: {
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        // Trick to get the thinest line the device can display
        height: 1 / PixelRatio.get(),
        marginLeft: 4,
    },
});


React.AppRegistry.registerComponent('GeoStreamer', () => App);
