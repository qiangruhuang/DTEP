#!/bin/bash
# 确保开发服务器在线（进程可能被会话回收）
code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 10)
if [ "$code" != "200" ]; then
  cd /home/z/my-project
  setsid bun run dev > /dev/null 2>&1 < /dev/null &
  for i in $(seq 1 25); do
    code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 30)
    [ "$code" = "200" ] && break
    sleep 3
  done
fi
echo "server: $code"
