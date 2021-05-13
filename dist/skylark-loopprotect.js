/**
 * skylark-loopprotect - A version of jsbin-loopprotect playground) that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylarkn-loopprotect/
 * @license MIT
 */
!function(e,n){var t=n.define,require=n.require,i="function"==typeof t&&t.amd,r=!i&&"undefined"!=typeof exports;if(!i&&!t){var o={};t=n.define=function(e,n,t){"function"==typeof t?(o[e]={factory:t,deps:n.map(function(n){return function(e,n){if("."!==e[0])return e;var t=n.split("/"),i=e.split("/");t.pop();for(var r=0;r<i.length;r++)"."!=i[r]&&(".."==i[r]?t.pop():t.push(i[r]));return t.join("/")}(n,e)}),resolved:!1,exports:null},require(e)):o[e]={factory:null,resolved:!0,exports:t}},require=n.require=function(e){if(!o.hasOwnProperty(e))throw new Error("Module "+e+" has not been defined");var module=o[e];if(!module.resolved){var t=[];module.deps.forEach(function(e){t.push(require(e))}),module.exports=module.factory.apply(n,t)||null,module.resolved=!0}return module.exports}}if(!t)throw new Error("The module utility (ex: requirejs or skylark-utils) is not loaded!");if(function(e,require){e("skylark-loopprotect/main",[],function(){"use strict";var e=null,n=/\b(for|while|do)\b/g,t=/\b(for|while|do)\b/,i=/\b(?!default:)([a-z_]{1}\w+:)/i,r=/(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s;])+\/\/(?:.*)$)/gm,o=function(u,a){var f=[],c=u.split("\n"),p=!1,d=o.alias+".protect",h={},g={},b=null;function E(e,n,t){return n.slice(0,t)+"{;"+d+"({ line: "+e+", reset: true }); "+n.slice(t)}a||(a=0);return c.forEach(function(o,u){if(n.lastIndex=0,i.lastIndex=0,!p){-1!==o.toLowerCase().indexOf("noprotect")&&(p=!0);var B=-1,D=-1,G=u,U=u-a+1,m="",v=!1,x=!1,y=!1,k=o.match(n)||[],w=k.length?k[0]:"",O=o.match(i)||[],j=0,I=0,q=!1;if(O.length&&(DEBUG&&e("- label match"),s(B=o.indexOf(O[1]),o)?DEBUG&&e("- ignored label in string or comment"):l(u,c)?DEBUG&&e("- ignored label in multline comment"):function(n,o,l){t.lastIndex=0,i.lastIndex=0;var s=!1,u=l.slice(o).join("\n").substr(n).replace(i,"");return u.replace(t,function(n,t,i){var o=u.substr(0,i).replace(r,"").trim();DEBUG&&e("- directlyBeforeLoop: "+o),0===o.length&&(s=!0)}),s}(B,u,c)?(DEBUG&&e('- found a label: "'+O[0]+'"'),b=u):DEBUG&&e('- ignored "label", false positive')),h[u])DEBUG&&e(" -exit: ignoring line "+u+": "+o);else{if(g[u])return DEBUG&&e("- exit: ignoring, but adding line "+u+": "+o),void f.push(o);if(w&&1===k.length&&-1===o.indexOf("jsbin")){if(DEBUG&&e("match on "+w+"\n"),v="do"===w,D=B=o.indexOf(w),s(B,o))return void f.push(o);if(l(u,c))return void f.push(o);for((B=o.indexOf(w)+w.length)===o.length&&B===o.length&&u<c.length-1&&(DEBUG&&e("- moving to next line"),f.push(o),o=c[++u],h[u]=!0,B=0);B<o.length;){if("("===(m=o.substr(B,1))&&j++,")"===m&&0==--j&&!1===y&&(y=B),"{"===m&&I++,"}"===m&&I--,0===j&&(";"===m||"{"===m)){if(";"===m)u!==G?(DEBUG&&e("- multiline inline loop"),f[G]=f[G].substring(0,y+1)+"{\nif ("+d+"({ line: "+U+" })) break;\n"+f[G].substring(y+1),o+="\n}}\n"):(DEBUG&&e("- single line inline loop"),o=o.substring(0,y+1)+"{\nif ("+d+"({ line: "+U+" })) break;\n"+o.substring(y+1)+"\n}}\n"),q=!0;else if("{"===m){DEBUG&&e("- multiline with braces");var T=";\nif ("+d+"({ line: "+U+" })) break;\n";o=o.substring(0,B+1)+T+o.substring(B+1),B+=T.length}if(u===G&&null===b?(DEBUG&&e("- simple reset insert"),o=E(U,o,D),B+=(";"+d+"({ line: "+u+", reset: true }); ").length):null===b?(DEBUG&&e("- reset inserted above original line"),f[G]=E(U,f[G],D)):(DEBUG&&e("- reset inserted above matched label on line "+b),void 0===f[b]&&(b--,D=0),f[b]=E(U,f[b],D),b=null),v){for(DEBUG&&e("searching for closing `while` statement for: "+o),x=!1;B<o.length;){if("{"===(m=o.substr(B,1))&&I++,"}"===m&&I--,x=0===I,0===I&&DEBUG&&e("outside of closure, looking for `while` statement: "+o),x&&-1!==o.indexOf("while"))return DEBUG&&e("- exit as we found `while`: "+o),o+="}",f.push(o),void(h[u]=!0);++B===o.length&&u<c.length-1&&(f.push(o),h[u]=!0,o=c[++u],DEBUG&&e(o),B=0)}return}if(q)return void f.push(o);for(DEBUG&&e("searching for closing brace of loop for: "+o);null!==o;){if(m=o.substr(B,1),DEBUG&&e(B,m,I),"{"===m&&I++,"}"===m&&0==--I)return DEBUG&&e("outside of loop, add a close brace to: "+o),o=o.substring(0,B+1)+"}"+o.substring(B+1),f.push(o),void(h[u]=!0);++B>=o.length&&(f.push(o),h[u]=!0,o=c[++u],DEBUG&&e(o),B=0)}return}++B===o.length&&u<c.length-1&&(DEBUG&&e("- moving to next line"),f.push(o),o=c[++u],h[u]=!0,B=0)}}else DEBUG&&e("regular line "+o),f.push(o)}}}),DEBUG&&e("---- source ----"),DEBUG&&e(u),DEBUG&&e("---- rewrite ---"),DEBUG&&e(f.join("\n")),DEBUG&&e(""),p?u:f.join("\n")};function l(n,t){if(0===n)return!1;var i=n,r=1,o=-1,l=-1;do{if(DEBUG&&e("looking backwards "+t[i]),o=t[i].indexOf("*/"),l=t[i].indexOf("/*"),-1!==o&&r++,o===t[i].length-2&&-1!==l&&r--,-1!==l&&0===--r)return DEBUG&&e("- exit: part of a multiline comment"),!0;i-=1}while(0!==i);return!1}function s(n,t){for(var i;--n>-1;){if('"'===(i=t.substr(n,1))||"'"===i||"."===i)return DEBUG&&e("- exit: matched inside a string or property key"),!0;if(("/"===i||"*"===i)&&(--n,"/"===i))return DEBUG&&e("- exit: part of a comment"),!0}return!1}return o.counters={},o.debug=function(n){e=n?function(){console.log.apply(console,[].slice.apply(arguments))}:function(){}},o.debug(!1),o.alias="loopProtect",o.protect=function(e){o.counters[e.line]=o.counters[e.line]||{};var n=o.counters[e.line],t=(new Date).getTime();return e.reset&&(n.time=t,n.hit=0,n.last=0),n.hit++,t-n.time>100?(o.hit(e.line),!0):(n.last++,!1)},o.hit=function(e){var n="Exiting potential infinite loop at line "+e+'. To disable loop protection: add "// noprotect" to your code';console.error(n)},o.reset=function(){o.counters={}},o}),e("skylark-loopprotect",["skylark-loopprotect/main"],function(e){return e})}(t),!i){var l=require("skylark-langx-ns");r?module.exports=l:n.skylarkjs=l}}(0,this);
//# sourceMappingURL=sourcemaps/skylark-loopprotect.js.map
