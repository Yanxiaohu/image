const trim = function (str) {
    str.replace(/[ ]/g, "")
    return str;
};

const trimZ = function (str) {
    const reg = /[\u4e00-\u9fa5]/g;
    str = str.replace(/[ ]/g, "");
    str = str.replace(reg, "");
    return str;
}

module.exports = {trim, trimZ}