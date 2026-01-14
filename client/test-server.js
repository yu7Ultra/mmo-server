const express = require('express');
const path = require('path');
const app = express();
const port = 3001;

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(__dirname));

// 默认路由返回测试页面
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-interpolation.html'));
});

// 启动服务器
app.listen(port, () => {
    console.log(`插值平滑测试服务器运行在 http://localhost:${port}`);
    console.log('打开浏览器访问上述地址来测试怪物和玩家的插值平滑效果');
});