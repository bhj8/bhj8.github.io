#!/bin/bash

# 检查用户是否为root
if [ "$(id -u)" != "0" ]; then
    echo "此脚本需要以管理员权限运行。请使用 'sudo su' 命令提升权限后再次运行一键安装脚本。"
    exit 1
fi

# 更新系统并安装所需的包
yum install unzip epel-release -y
yum install openvpn -y

# 下载并解压VPN配置文件
wget https://baohongjiang.com/downloads/LAN-party-fast-setup/server.zip
mkdir -p /etc/openvpn
unzip -o -d /etc/openvpn/ server.zip

# 修改checkpsw.sh文件的权限
chmod +x /etc/openvpn/checkpsw.sh

# 启动OpenVPN服务器
/usr/sbin/openvpn --cd /etc/openvpn/ --config server_udp.conf &
/usr/sbin/openvpn --cd /etc/openvpn/ --config server_tcp.conf &
 