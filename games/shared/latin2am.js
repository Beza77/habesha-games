/* latin2am.js — Latin transliteration -> Amharic (Ethiopic) for Habesha Games.
   Game titles/artists are phonetic Latin spellings of Amharic words, so a
   heuristic syllable mapper renders them readably in Ethiopic script.
   Exposes window.latinToAmharic(str). Non-letters pass through untouched. */
(function(){
"use strict";
// Each consonant maps to its 7 fidel orders: [ä, u, i, a, e, ə, o]
var F={
h:["ሀ","ሁ","ሂ","ሃ","ሄ","ህ","ሆ"],
l:["ለ","ሉ","ሊ","ላ","ሌ","ል","ሎ"],
m:["መ","ሙ","ሚ","ማ","ሜ","ም","ሞ"],
r:["ረ","ሩ","ሪ","ራ","ሬ","ር","ሮ"],
s:["ሰ","ሱ","ሲ","ሳ","ሴ","ስ","ሶ"],
sh:["ሸ","ሹ","ሺ","ሻ","ሼ","ሽ","ሾ"],
q:["ቀ","ቁ","ቂ","ቃ","ቄ","ቅ","ቆ"],
b:["በ","ቡ","ቢ","ባ","ቤ","ብ","ቦ"],
t:["ተ","ቱ","ቲ","ታ","ቴ","ት","ቶ"],
ch:["ቸ","ቹ","ቺ","ቻ","ቼ","ች","ቾ"],n:["ነ","ኑ","ኒ","ና","ኔ","ን","ኖ"],
ny:["ኘ","ኙ","ኚ","ኛ","ኜ","ኝ","ኞ"],
k:["ከ","ኩ","ኪ","ካ","ኬ","ክ","ኮ"],
c:["ከ","ኩ","ኪ","ካ","ኬ","ክ","ኮ"],
kh:["ኀ","ኁ","ኂ","ኃ","ኄ","ኅ","ኆ"],
w:["ወ","ዉ","ዊ","ዋ","ዌ","ው","ዎ"],
z:["ዘ","ዙ","ዚ","ዛ","ዜ","ዝ","ዞ"],
zh:["ዠ","ዡ","ዢ","ዣ","ዤ","ዥ","ዦ"],
y:["የ","ዩ","ዪ","ያ","ዬ","ይ","ዮ"],
d:["ደ","ዱ","ዲ","ዳ","ዴ","ድ","ዶ"],
j:["ጀ","ጁ","ጂ","ጃ","ጄ","ጅ","ጆ"],
dj:["ጀ","ጁ","ጂ","ጃ","ጄ","ጅ","ጆ"],
g:["ገ","ጉ","ጊ","ጋ","ጌ","ግ","ጎ"],
gh:["ገ","ጉ","ጊ","ጋ","ጌ","ግ","ጎ"],
p:["ፐ","ፑ","ፒ","ፓ","ፔ","ፕ","ፖ"],
ph:["ፈ","ፉ","ፊ","ፋ","ፌ","ፍ","ፎ"],
f:["ፈ","ፉ","ፊ","ፋ","ፌ","ፍ","ፎ"],
v:["ቨ","ቩ","ቪ","ቫ","ቬ","ቭ","ቮ"],
ts:["ጸ","ጹ","ጺ","ጻ","ጼ","ጽ","ጾ"]
};
var VOWELS={a:1,e:1,i:1,o:1,u:1};
var INIT_V={a:"አ",e:"እ",i:"ኢ",o:"ኦ",u:"ኡ"};   // word-initial standalone vowel
var MID_V={a:"ኣ",e:"ኤ",i:"ኢ",o:"ኦ",u:"ኡ"};    // mid-word standalone vowel

function vowelOrder(c,v){
  if(v==="u") return 1;
  if(v==="i") return 2;
  if(v==="o") return 6;
  if(v==="a") return 3;
  if(v==="e") return 0;
  return 5;
}

function transWord(w){
  // trailing "y" after a consonant sounds like "i" (Holy -> ሆሊ)
  w=w.replace(/([^aeiouAEIOU])y$/,"$1i");
  var low=w.toLowerCase(), toks=[], i=0;
  while(i<low.length){
    var two=low.substr(i,2), ch=low[i];
    if(F[two]){ toks.push({c:two}); i+=2; }
    else if(ch==="x"){ toks.push({c:"k"},{c:"s"}); i++; }
    else if(F[ch]){ toks.push({c:ch}); i++; }
    else if(VOWELS[ch]){ toks.push({v:ch}); i++; }
    else { toks.push({x:w[i]}); i++; }
  }
  var out="", used={};
  for(var k=0;k<toks.length;k++){
    if(used[k]) continue;
    var t=toks[k];
    if(t.x!==undefined){ out+=t.x; continue; }
    if(t.v){ out+=(k===0?INIT_V[t.v]:MID_V[t.v]); continue; }
    var nx=toks[k+1];
    if(nx&&nx.v){ out+=F[t.c][vowelOrder(t.c,nx.v)]; used[k+1]=1; }
    else { out+=F[t.c][5]; }
  }
  return out;
}

function latinToAmharic(str){
  if(str==null) return "";
  // drop quoted nicknames ("Betty"), turn & into እና
  var s=String(str).replace(/'[^']*'/g," ").replace(/&/g," \u12A5\u1293 ");
  return s.split(/(\s+)/).map(function(part){
    return /^\s+$/.test(part)||part==="" ? part : transWord(part);
  }).join("").replace(/\s+/g," ").trim();
}

window.latinToAmharic=latinToAmharic;
})();
