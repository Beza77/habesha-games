/* =====================================================================
   PartyNet — shared room-code multiplayer for Habesha Games party titles.
   Fixes two real party problems:
   1) A phone that sleeps mid-game drops off and can't get back in.
   2) Joining sometimes fails silently (join sent before the host is ready,
      or a flaky first broker attempt).

   What it does:
   - Wake Lock: keeps the screen on while a game is active (best fix for #1).
   - Auto-reconnect: when the phone wakes, the game network reconnects by
     itself, re-subscribes, and the player re-announces so the host sends
     the current game state (fixes #1 when sleep still happens).
   - Broker failover: if one public broker stays down, it moves to the next.
   - onReconnect hook: lets each game re-sync after a drop.

   Drop-in usage (replaces the old inline MQTT block):
     <script src="../shared/party-net.js"></script>
     <script>window.PARTY_TOPIC="habesha-bingo/v1/";</script>
     mqttConnect(code, onOk, onFail, onReconnect);
     send(msg); mqttEnd();
     msgHandler = m => {...};   // assignable any time, like before
     PartyNet.keepAwake();       // when entering a game
     PartyNet.releaseWake();     // when leaving to home
   ===================================================================== */
(function(){
"use strict";

var BROKERS = [
  "wss://broker.emqx.io:8084/mqtt",
  "wss://test.mosquitto.org:8081/mqtt"
];

/* msgHandler is intentionally a plain global so existing game code
   (msgHandler = m => {...}) keeps working unchanged. */
window.msgHandler = window.msgHandler || null;

var _client = null;
var _topic = null;

function topicFor(code){
  var prefix = window.PARTY_TOPIC || "habesha-party/v1/";
  return prefix + code;
}

/* Connect with auto-reconnect + broker failover.
   onOk()        — first successful subscribe
   onFail(msg)   — no broker reachable
   onReconnect() — every later reconnect (phone woke up, network blip) */
window.mqttConnect = function(code, onOk, onFail, onReconnect){
  var settled = false;   // becomes true after the first good subscribe
  var bIdx = 0;

  function tryNext(){
    if(bIdx >= BROKERS.length){
      if(onFail) onFail("Could not reach the game network. Check your connection and retry.");
      return;
    }
    var url = BROKERS[bIdx++];
    var opened = false;
    var fails = 0;
    try{
      _client = mqtt.connect(url, {connectTimeout: 8000, reconnectPeriod: 2500});
    }catch(e){ tryNext(); return; }

    var to = setTimeout(function(){
      if(!opened){ try{ _client.end(true); }catch(e){} tryNext(); }
    }, 9000);

    _client.on("connect", function(){
      opened = true; fails = 0; clearTimeout(to);
      _topic = topicFor(code);
      _client.subscribe(_topic, {qos: 0}, function(err){
        if(err){ try{ _client.end(true); }catch(e){} tryNext(); return; }
        if(settled){ if(onReconnect) onReconnect(); }
        else { settled = true; if(onOk) onOk(); }
      });
    });

    /* mqtt.js keeps retrying the same broker on its own. If it stays down,
       give up on it and fail over to the next broker. */
    _client.on("reconnect", function(){
      fails++;
      if(fails > 5){ try{ _client.end(true); }catch(e){} tryNext(); }
    });

    _client.on("message", function(t, buf){
      if(t === _topic && window.msgHandler){
        try{ window.msgHandler(JSON.parse(buf.toString())); }catch(e){}
      }
    });
    _client.on("error", function(){});
  }

  tryNext();
};

window.send = function(msg){
  if(_client && _client.connected && _topic){
    _client.publish(_topic, JSON.stringify(msg), {qos: 0, retain: false});
  }
};

window.mqttEnd = function(){
  try{ if(_client) _client.end(true); }catch(e){}
  _client = null; _topic = null;
};

/* ---------------- Wake Lock: don't let the phone sleep mid-game ---------------- */
var _wakeLock = null;
var _wakeWanted = false;

function _requestWake(){
  if(!_wakeWanted) return;
  if(!("wakeLock" in navigator)) return;
  navigator.wakeLock.request("screen").then(function(lock){
    _wakeLock = lock;
    lock.addEventListener("release", function(){ _wakeLock = null; });
  }).catch(function(){ /* not allowed — reconnect logic still covers it */ });
}

document.addEventListener("visibilitychange", function(){
  if(document.visibilityState === "visible"){ _requestWake(); }
});

window.PartyNet = {
  /* Call when the player/host enters an active game screen. */
  keepAwake: function(){
    _wakeWanted = true;
    _requestWake();
  },
  /* Call when leaving back to home. */
  releaseWake: function(){
    _wakeWanted = false;
    try{ if(_wakeLock) _wakeLock.release(); }catch(e){}
    _wakeLock = null;
  }
};

})();
