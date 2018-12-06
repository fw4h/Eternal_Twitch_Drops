// ==UserScript==
// @name         Eternal Twitch Drop
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www.twitch.tv/zenaton?referrer=raid
// @grant        none
// ==/UserScript==


var DIRECTORY_URL = 'https://www.twitch.tv/directory/game/Eternal';
 
(function() {
    'use strict';
    var nbReloads = 0;
   
    function stuff() {
        var currentGame = document.getElementsByClassName('drops-campaign-details__drops-success tw-strong')[0].textContent;
       
         if (window.location.href == DIRECTORY_URL) {
            // choose a streamer
            var streams = document.getElementsByClassName('tw-mg-b-2 tw-relative');
            var validStreams = [];
            
            console.log(streams.length);
            // for(var i=0; i < streams.length; i++) {
            //     // remove vodcasts and low viewer counts (might not have quality options)
            //     var isVodCast = streams[i].getElementsByClassName('is-watch-party').length;
            //     var viewerCount = streams[i].getElementsByClassName('card__info')[0].getElementsByClassName('ember-view')[0].innerHTML.split(' ')[0];
               
            //     if(!isVodCast && viewerCount > 100) {
            //         validStreams.push(streams[i].getElementsByTagName('a')[0].href);
            //     }
            // }
             
            if(streams.length) {
                // select a random stream
                window.location = streams[Math.floor(Math.random() * streams.length)];
            } else {
                // we filtered everything out... Go to #2 directly (to give a chance to get them to #1 and shuffle the streamer order a bit!)
                //window.location = streams[Math.min(1, streams.length-1)].getElementsByTagName('a')[0].href;
            }
        } else if (!(currentGame === "Drops enabled!")) {
            // get back to ESL!
            //alert(currentGame);
            window.location = DIRECTORY_URL;
        } else {
            // re-evaluate every now and then and reload every few cycles incase something gets stuck
            nbReloads++;
            if(nbReloads >= 6) {
                location.reload();
            } else {
                setTimeout(stuff, 1000*60*5);
            }
        }
    }
   
    setTimeout(stuff, 1000*10);

// (function () {
//     'use strict';
//     document.addEventListener("DOMContentLoaded", function() {
//         var b = document.getElementById('tw-svg__asset tw-svg__asset--more tw-svg__asset--inherit');
//         b.addEventListener('click', test, false);
//     });

//     var activeDropBronze = document.getElementById('bronzeIdle-output');
//     setInterval(function () {
//         //activeDropBronze.click()
//     }, 200);

//     var activeDropSilver = document.getElementById('silverIdle-output');
//     setInterval(function () {
//         //activeDropSilver.click()
//     }, 200);

//     var testdwang62 = document.querySelector('tw-svg__asset tw-svg__asset--more tw-svg__asset--inherit');
//     var mounsedownEvent = new MouseEvent('mousedown');
//     var mounseupEvent = new MouseEvent('mouseup');

//     setInterval(function () {
//         testdwang62.InvokeMember("click");
//         // test.dispatchEvent(mounsedownEvent);
//         // test.dispatchEvent(mounseupEvent);
//         // test.trigger('click')
//         //test.click()
//     }, 200);

    // $('tw-svg__asset tw-svg__asset--more tw-svg__asset--inherit').trigger('click');
    // $(document).ready(function () {
    //     $('bronzeIdle-output').trigger('click');
    // });

    // <li class="icons_tabs_1" data-tab="1"><i></i><span class="tabs_text"></span></li>

    // <svg class="tw-svg__asset tw-svg__asset--more tw-svg__asset--inherit" width="20px" height="20px" version="1.1" viewBox="0 0 20 20" x="0px" y="0px"><path d="M12 4a2 2 0 1 1-4.002-.002A2 2 0 0 1 12 4zm0 6a2 2 0 1 1-4.002-.002A2 2 0 0 1 12 10zm0 6a2 2 0 1 1-4.002-.002A2 2 0 0 1 12 16z" fill-rule="evenodd"></path></svg>


    // Your code here...
})();