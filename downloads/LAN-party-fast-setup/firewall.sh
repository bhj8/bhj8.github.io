#!/bin/bash

# ... [之前的脚本部分]

# 定义防火墙配置函数
configure_firewall() {
    firewall=$1
    echo "配置 $firewall 防火墙，允许特定端口..."

    case $firewall in
        ufw)
            ufw allow 3075/tcp
            ufw allow 3074/udp
            ufw enable
            ;;
        iptables)
            iptables -A INPUT -p tcp --dport 3075 -j ACCEPT
            iptables -A INPUT -p udp --dport 3074 -j ACCEPT
            iptables-save
            ;;
        firewalld)
            firewall-cmd --zone=public --add-port=3075/tcp --permanent
            firewall-cmd --zone=public --add-port=3074/udp --permanent
            firewall-cmd --reload
            ;;
        *)
            echo "未知防火墙类型: $firewall"
            return 1
            ;;
    esac
}

# 检测并配置已安装的防火墙
firewall_configured=false

if command -v ufw >/dev/null 2>&1; then
    configure_firewall ufw && firewall_configured=true
elif command -v iptables >/dev/null 2>&1; then
    configure_firewall iptables && firewall_configured=true
elif command -v firewall-cmd >/dev/null 2>&1; then
    configure_firewall firewalld && firewall_configured=true
fi

if [ "$firewall_configured" = false ]; then
    echo "未检测到已安装的防火墙软件，跳过防火墙配置。"
fi

# ... [后续脚本部分]
