/**
 * 文件描述
 * @author ydr.me
 * @create 2016-05-10 14:44
 */



'use strict';

var Popover = require('../src/index');
var selector = require('blear.core.selector');
var array = require('blear.utils.array');

var pp = new Popover({
    width: 'auto',
    height: 'auto'
});

pp.setHTML('呵呵哒');
var btnEls = selector.query('.btn');
array.each(btnEls, function (index, btnEl) {
    btnEl.onclick = function () {
        pp.open(this);
    };
});
