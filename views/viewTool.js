layui.define(function (exports) { //提示：模块也可以依赖其它模块，如：layui.define('mod1', callback);
    const condeMessage = function (code, message) {
        if (code == 5) {
            layer.open({
                title: '',
                content: message,
                yes: function (index) {
                    clearUserInfo();
                },
            });
        } else if (code == 3) {
            layer.open({
                title: '',
                content: message,
            });
        } else if (code == 1) {
            layer.msg(JSON.stringify(message), {icon: code});
        } else {
            layer.open({
                title: 'CODE码是' + code,
                content: message,
                yes: function (index) {
                    layer.close(index)
                    clearUserInfo();
                },
                cancel: function (index) {
                    layer.close(index)
                    clearUserInfo();
                }
            });
        }
    }
    const clearUserInfo = function () {
        localStorage.setItem('token', '');
        window.location.href = '/';
    }
    exports('viewTool', condeMessage, clearUserInfo);
});
