// ==UserScript==
// @name         Eternal Twitch Drop
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www.twitch.tv/zenaton?referrer=raid
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    $(document).ready(function () {
        $('bronzeIdle-output').trigger('click');
    });


    // Your code here...
})();