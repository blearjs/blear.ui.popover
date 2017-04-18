/**
 * 位置弹出框
 * @author ydr.me
 * @create 2016-05-10 14:18
 */



'use strict';

var UI = require('blear.ui');
var selector = require('blear.core.selector');
var layout = require('blear.core.layout');
var attribute = require('blear.core.attribute');
var modification = require('blear.core.modification');
var object = require('blear.utils.object');
var typeis = require('blear.utils.typeis');
var array = require('blear.utils.array');
var fun = require('blear.utils.function');
var template = require('./template.html', 'html');

var win = window;
var doc = win.document;
var namespace = UI.UI_CLASS + '-popover';
// 默认的检查顺序
var DEFAULT_POSITION_LIST = ['bottom', 'top', 'right', 'left'];
// 默认的对齐顺序
var DEFAULT_ALIGN_LIST = ['center', 'side'];
var gid = 0;
var defaults = {
    /**
     * 箭头位置：auto，检测顺序为以及可选值还有：bottom、right、top、left
     * @type String
     */
    arrowPosition: 'auto',

    /**
     * 箭头的尺寸
     * @type Number
     */
    arrowSize: 10,

    /**
     * 对齐顺序：center、side
     * ```
     * center:
     *        [=====]
     * [=========^=========]
     *
     * side:
     *        [=====]
     *       [===^===============]
     * ```
     * @type String
     */
    align: 'center',


    /**
     * 左偏移
     * @type Number
     */
    offsetLeft: 0,


    /**
     * 上偏移
     * @type Number
     */
    offsetTop: 0,


    /**
     * 弹出泡宽度
     * @type String|Number
     */
    width: 'auto',


    /**
     * 弹出泡高度
     * @type String|Number
     */
    height: 'auto',


    /**
     * 添加的 class
     * @type String
     */
    addClass: '',


    /**
     * 打开的动画
     * @param to
     * @param done
     */
    openAnimation: function (to, done) {
        var el = this.getPopoverEl();
        attribute.style(el, to);
        done();
    },


    /**
     * 关闭的动画
     * @param to
     * @param done
     */
    closeAnimation: function (to, done) {
        var el = this.getPopoverEl();
        attribute.style(el, to);
        done();
    }
};
var Popover = UI.extend({
    className: 'Popover',
    constructor: function (options) {
        var the = this;

        Popover.parent(the);
        the[_options] = object.assign(true, {}, defaults, options);
        the[_initNode]();
        the[_visible] = false;
    },


    /**
     * 获取弹出元素
     * @returns {HTMLElement}
     */
    getPopoverEl: function () {
        return this[_popoverEl];
    },


    /**
     * 内容区域
     * @returns {*}
     */
    getContentEl: function () {
        return this[_contentEl];
    },


    /**
     * 设置 HTML
     * @param html {String|Node}
     * @returns {HTMLElement}
     */
    setHTML: function (html) {
        var the = this;

        if (typeis.String(html)) {
            attribute.html(the[_contentEl], html);
        } else if (html && html.nodeType) {
            modification.empty(the[_contentEl]);
            modification.insert(html, the[_contentEl]);
        }

        return selector.children(the[_contentEl])[0];
    },


    /**
     * 打开弹出泡
     * @param target {Object} 目标，可以是一个事件，也可以是一个包含 left/top 的位置坐标
     * @param [callback]
     * @returns {Popover}
     */
    open: function (target, callback) {
        var the = this;
        var options = the[_options];
        callback = fun.ensure(callback);

        // 1. 计算窗口位置
        the[_documentPosition] = {
            width: layout.outerWidth(doc),
            height: layout.outerHeight(doc)
        };

        // 2. 计算目标位置
        // 元素
        if (typeis.Element(target)) {
            the[_targetPosition] = {
                width: layout.outerWidth(target),
                height: layout.outerHeight(target),
                left: layout.clientLeft(target),
                top: layout.clientTop(target)
            };
        }
        // event
        else if (target.preventDefault) {
            the[_targetPosition] = {
                width: 2,
                height: 2,
                left: target.pageX,
                top: target.pageY
            };
        }
        // object
        else {
            the[_targetPosition] = target;
        }

        // 3. 透明显示 popup，便于计算
        attribute.style(the[_popoverEl], object.assign(true, {
            zIndex: UI.zIndex(),
            display: 'block',
            top: 0,
            left: 0,
            visibility: 'hidden'
        }, {
            width: options.width,
            height: options.height
        }));
        the[_popoverPosition] = {
            width: layout.outerWidth(the[_popoverEl]),
            height: layout.outerHeight(the[_popoverEl])
        };

        // 4. 第一优先级的位置，如果全部位置都不符合，则选择第一优先级的位置
        // popup 位置顺序
        var dirList = options.arrowPosition === 'auto' ?
            DEFAULT_POSITION_LIST :
            [options.arrowPosition];
        // 优先级顺序
        var alignList = options.align === 'center' ? DEFAULT_ALIGN_LIST : ['side'];
        var arrowMap = {
            bottom: 'top',
            right: 'left',
            top: 'bottom',
            left: 'right'
        };
        var firstPos = null;
        var findArrow = null;
        var findPos = null;

        array.each(dirList, function (i, dir) {
            var arrow = arrowMap[dir];

            array.each(alignList, function (j, align) {
                var pos = the[_calPopoverPositionByAlign](dir, align);

                if (i === 0 && align === 'side') {
                    firstPos = pos;
                }

                if (the[_boundaryCheck](pos)) {
                    findPos = pos;
                    findArrow = arrow;
                    return false;
                }
            });

            if (findPos) {
                return false;
            }
        });

        if (!findPos) {
            findPos = firstPos;
            findArrow = arrowMap[dirList[0]];
        }

        // 5. 显示
        attribute.style(the[_popoverEl], {
            visibility: 'visible'
        });
        the[_calArrowPosition](findPos._side, findArrow);

        // 6. 动画
        var to = {
            top: findPos.top,
            left: findPos.left
        };

        if (the.emit('beforeOpen', to) === false) {
            return the;
        }

        the[_visible] = true;
        options.openAnimation.call(the, to, function () {
            the.emit('afterOpen');
            callback.call(the);
        });

        return the;
    },


    /**
     * 关闭弹出泡
     * @returns {Popover}
     */
    close: function (callback) {
        var the = this;
        var options = the[_options];
        callback = fun.ensure(callback);

        if (!the[_visible]) {
            return the;
        }

        var to = {
            display: 'none'
        };

        if (the.emit('beforeClose', to) === false) {
            return the;
        }

        the[_visible] = false;
        options.closeAnimation.call(the, to, function () {
            the.emit('afterClose');
            callback.call(the);
        });

        return the;
    },


    /**
     * 当前是否可见
     * @returns {Boolean}
     */
    isVisible: function () {
        return this[_visible];
    },


    /**
     * 销毁实例
     * @param callback
     */
    destroy: function (callback) {
        var the = this;
        callback = fun.ensure(callback);

        fun.until(function () {
            modification.remove(the[_popoverEl]);
            callback.call(the);
            Popover.parent.destroy(the);
        }, function () {
            return the[_visible] === false;
        });
    }
});
var pro = Popover.prototype;
var _options = Popover.sole();
var _visible = Popover.sole();
var _initNode = Popover.sole();
var _popoverEl = Popover.sole();
var _arrorTopEl = Popover.sole();
var _arrorRightEl = Popover.sole();
var _arrorBottomEl = Popover.sole();
var _arrorLeftEl = Popover.sole();
var _contentEl = Popover.sole();
var _documentPosition = Popover.sole();
var _targetPosition = Popover.sole();
var _popoverPosition = Popover.sole();
var _calPopoverPositionByAlign = Popover.sole();
var _boundaryCheck = Popover.sole();
var _calArrowPosition = Popover.sole();


/**
 * 初始化节点
 */
pro[_initNode] = function () {
    var the = this;
    var node = modification.parse(template);

    node.id = namespace + (gid++);
    attribute.addClass(node, the[_options].addClass);
    the[_popoverEl] = modification.insert(node);
    var children = selector.children(the[_popoverEl]);
    the[_arrorTopEl] = children[0];
    the[_arrorRightEl] = children[1];
    the[_arrorBottomEl] = children[2];
    the[_arrorLeftEl] = children[3];
    the[_contentEl] = children[4];
};


/**
 * 按对齐方式来定位计算
 * @param dir
 * @param priority
 * @private
 */
pro[_calPopoverPositionByAlign] = function (dir, priority) {
    var the = this;
    var options = the[_options];
    var targetPosition = the[_targetPosition];
    var popoverPosition = the[_popoverPosition];
    var pos = {};
    var firstSide;
    var secondSide;
    var optionsOffsetLeft = options.offsetLeft;
    var optionsOffsetTop = options.offsetTop;
    var optionsArrowSize = options.arrowSize;
    var targetPositionLeft = targetPosition.left;
    var targetPositionTop = targetPosition.top;
    var targetPositionWidth = targetPosition.width;
    var targetPositionHeight = targetPosition.height;
    var popoverPositionWidth = popoverPosition.width;
    var popoverPositionHeight = popoverPosition.height;

    /**
     * 靠边检测
     * @param type
     * @param firstSide
     * @param secondSide
     * @returns {*}
     */
    var sideCheck = function (type, firstSide, secondSide) {
        var list = [firstSide, secondSide];
        var findSide = null;

        array.each(list, function (index, side) {
            pos[type] = side;

            if (the[_boundaryCheck](pos)) {
                findSide = side;
                pos._side = index;
                return false;
            }
        });

        if (findSide === null) {
            findSide = firstSide;
            pos._side = 0;
        }

        pos[type] = findSide;

        switch (type) {
            case 'left':
                pos[type] += optionsOffsetLeft;
                break;
            case 'right':
                pos[type] -= optionsOffsetLeft;
                break;
            case 'top':
                pos[type] += optionsOffsetTop;
                break;
            case 'bottom':
                pos[type] -= optionsOffsetTop;
                break;
        }
    };

    if (priority === 'center') {
        switch (dir) {
            case 'bottom':
                pos.left = targetPositionLeft + targetPositionWidth / 2 - popoverPositionWidth / 2;
                pos.top = targetPositionTop + targetPositionHeight + optionsArrowSize + optionsOffsetTop;
                break;

            case 'right':
                pos.left = targetPositionLeft + targetPositionWidth + optionsArrowSize + optionsOffsetLeft;
                pos.top = targetPositionTop + targetPositionHeight / 2 - popoverPositionHeight / 2;
                break;

            case 'top':
                pos.left = targetPositionLeft + targetPositionWidth / 2 - popoverPositionWidth / 2;
                pos.top = targetPositionTop - optionsArrowSize - popoverPositionHeight - optionsOffsetTop;
                break;

            case 'left':
                pos.left = targetPositionLeft - optionsArrowSize - popoverPositionWidth - optionsOffsetLeft;
                pos.top = targetPositionTop + targetPositionHeight / 2 - popoverPositionHeight / 2;
                break;
        }
    } else {
        switch (dir) {
            case 'bottom':
                pos.top = targetPositionTop + targetPositionHeight + optionsArrowSize + optionsOffsetTop;
                firstSide = targetPositionLeft;
                secondSide = targetPositionLeft + targetPositionWidth - popoverPositionWidth;
                sideCheck('left', firstSide, secondSide);
                break;

            case 'right':
                pos.left = targetPositionLeft + targetPositionWidth + optionsArrowSize + optionsOffsetLeft;
                firstSide = targetPositionTop;
                secondSide = targetPositionTop + targetPositionHeight - popoverPositionHeight;
                sideCheck('top', firstSide, secondSide);
                break;

            case 'top':
                pos.top = targetPositionTop - popoverPositionHeight - optionsArrowSize - optionsOffsetTop;
                firstSide = targetPositionLeft;
                secondSide = targetPositionLeft + targetPositionWidth - popoverPositionWidth;
                sideCheck('left', firstSide, secondSide);
                break;

            case 'left':
                pos.left = targetPositionLeft - optionsArrowSize - popoverPositionWidth - optionsOffsetLeft;
                firstSide = targetPositionTop;
                secondSide = targetPositionTop + targetPositionHeight - popoverPositionHeight;
                sideCheck('top', firstSide, secondSide);
                break;
        }
    }

    return pos;
};


/**
 * 边界检测
 * @param pos
 * @returns {boolean}
 * @private
 */
pro[_boundaryCheck] = function (pos) {
    var the = this;
    var documentPosition = the[_documentPosition];
    var popoverPosition = the[_popoverPosition];

    if (pos.left < 0 || pos.top < 0) {
        return false;
    }

    return pos.left + popoverPosition.width <= documentPosition.width && pos.top + popoverPosition.height <= documentPosition.height;
};


/**
 * 显示箭头
 * @param side {Number|undefined} 靠边，0=左上边，1=右下边，undefined：中间
 * @param dir {String} 箭头显示的方向
 * @private
 */
pro[_calArrowPosition] = function (side, dir) {
    var the = this;
    var options = the[_options];
    var targetPosition = the[_targetPosition];
    var popoverPosition = the[_popoverPosition];
    var none = {
        display: 'none'
    };
    var map = {
        top: the[_arrorTopEl],
        right: the[_arrorRightEl],
        bottom: the[_arrorBottomEl],
        left: the[_arrorLeftEl]
    };
    var pos = {
        display: 'block'
    };
    var optionsArrowSize = options.arrowSize;
    var targetPositionWidth = targetPosition.width;
    var targetPositionHeight = targetPosition.height;
    var popoverPositionWidth = popoverPosition.width;
    var popoverPositionHeight = popoverPosition.height;

    object.each(map, function (key, el) {
        attribute.hide(el);
    });

    if (!optionsArrowSize) {
        return;
    }

    switch (dir) {
        case 'top':
        case 'bottom':
            switch (side) {
                case 0:
                    pos.left = targetPositionWidth / 2;
                    break;

                case 1:
                    pos.left = popoverPositionWidth - targetPositionWidth / 2;
                    break;

                default:
                    pos.left = popoverPositionWidth / 2;
                    break;
            }
            pos.left -= optionsArrowSize;
            break;

        case 'right':
        case 'left':
            switch (side) {
                case 0:
                    pos.top = targetPositionHeight / 2;
                    break;

                case 1:
                    pos.top = popoverPositionHeight - targetPositionHeight / 2;
                    break;

                default:
                    pos.top = popoverPositionHeight / 2;
                    break;
            }
            pos.top -= optionsArrowSize;
            break;
    }

    attribute.style(map[dir], pos);
};


require('./style.css', 'css|style');
Popover.defaults = defaults;
module.exports = Popover;
