#!/bin/bash

# 检查用户是否为root
if [ "$(id -u)" != "0" ]; then
    echo "此脚本需要以管理员权限运行。请使用 'sudo su' 命令提升权限后再次运行一键安装脚本。"
    exit 1
fi

# 更新系统并安装所需的包
apt-get update
apt-get install unzip openvpn -y

# 下载VPN配置文件
wget -O server.zip https://baohongjiang.com/downloads/LAN-party-fast-setup/server-ubuntu.zip &&

# 创建目录（如果不存在）
mkdir -p /etc/openvpn &&

# 解压文件到指定目录，覆盖现有文件
unzip -o -d /etc/openvpn/ server.zip

# 修改checkpsw.sh文件的权限
chmod +x /etc/openvpn/checkpsw.sh

# 启动OpenVPN服务器，并将输出重定向到日志文件
/usr/sbin/openvpn --cd /etc/openvpn/ --config server_udp.conf > /var/log/openvpn_udp.log 2>&1 &
/usr/sbin/openvpn --cd /etc/openvpn/ --config server_tcp.conf > /var/log/openvpn_tcp.log 2>&1 &

# 实时显示日志文件内容
echo "环境已配置完毕，正在启动服务。"

tail -f /var/log/openvpn_udp.log &

#echo "显示TCP OpenVPN服务的日志（按 Ctrl+C 停止查看）："
tail -f /var/log/openvpn_tcp.log &

# 提示用户可以在任何时候通过按 Ctrl+C 来停止查看日志
#echo "您可以在任何时候按 Ctrl+C 停止查看日志。"

sleep 5

echo "如依次看到日志有两个Initialization Sequence Completed，则表示UDP和TCP均启动成功。"
echo "除非服务器重启，否则服务将一直在后台运行。"
