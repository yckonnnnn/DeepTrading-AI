#!/bin/bash
set -e  # 出错立即退出

# ========== 替换为你的实际配置 ==========
GIT_REPO="https://gitee.com/yckonnnn/deep-trading-ai.git"
DOMAIN="deeptrading.top"
TONGYI_API_KEY="xxxx"  # 通义千问密钥
DB_HOST="rm-xxx.mysql.rds.aliyuncs.com"            # 数据库地址
DB_USER="xxx"            # 数据库用户名
DB_PASSWORD="xxx@"       # 数据库密码
DB_NAME="xxx"            # 数据库名
DB_PORT="3360"            # 数据库端口
ACCESS_KEY_ID="xxx"          # 如：LTAI5txxxxxx
ACCESS_KEY_SECRET="rm-xxx"  # 如：5Bxxxxxx
# 【核心】控制台「发信地址」中已验证的触发邮件地址（完整格式：xxx@deeptrading.com）
FROM_ALIAS="xxx"                   # 发件人别名（控制台无限制）
ACCOUNT_NAME="xxx@xxx.work"     
# 回复邮箱地址（和ACCOUNT_NAME一致，已验证的发信邮箱）
REPLY_ADDRESS="xxx@xxx.work"
# =======================================

# 步骤1：清理旧代码，拉取新代码
cd /opt/project
rm -rf deep-trading-ai
git clone $GIT_REPO deep-trading-ai
cd deep-trading-ai

# 步骤2：安装前端依赖
npm install --registry=https://registry.npm.taobao.org

# 步骤3：修复前端硬编码
FILES_TO_PATCH=(
  "services/geminiService.ts"
  "App.tsx"
  "components/Auth.tsx"
  "components/Dashboard.tsx"
  "components/Settings.tsx"
  "components/StockAnalysis.tsx"
  "components/Subscription.tsx"
)
for f in "${FILES_TO_PATCH[@]}"; do
  if [ -f "$f" ]; then
    sed -i 's/const API_BASE_URL = "http:\/\/localhost:3001";/const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";/g' "$f" || true
    sed -i 's/const API_BASE_URL = '\''http:\/\/localhost:3001'\'';/const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";/g' "$f" || true
    sed -i 's/\([[:space:]]\+\)const API_BASE_URL = '\''http:\/\/localhost:3001'\'';/\1const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";/g' "$f" || true
  fi
done

# 步骤4：配置前端.env.production
echo 'VITE_API_BASE_URL=""' > .env.production

# 步骤5：配置后端.env.local（后端从项目根目录读取）
cat > .env.local << EOF
Tongyiqianwen_API_KEY=$TONGYI_API_KEY
DB_HOST=$DB_HOST
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
DB_PORT=$DB_PORT
ACCESS_KEY_ID=$ACCESS_KEY_ID
ACCESS_KEY_SECRET=$ACCESS_KEY_SECRET
FROM_ALIAS=$FROM_ALIAS
ACCOUNT_NAME=$ACCOUNT_NAME
REPLY_ADDRESS=$REPLY_ADDRESS
EOF

# 步骤6：构建前端生产包
npm run build

# 步骤7：重启后端服务（先杀旧进程，再后台启动）
if command -v pm2 >/dev/null 2>&1; then
  pm2 delete deeptrading-ai >/dev/null 2>&1 || true
  pm2 start "npm" --name deeptrading-ai -- run server
  pm2 save
else
  pkill -f "node server/index.js" >/dev/null 2>&1 || true
  nohup npm run server > server_run.log 2>&1 &
fi

NGINX_SITE="/etc/nginx/conf.d/${DOMAIN}.conf"
if [ -d "/etc/nginx/sites-available" ]; then
  NGINX_SITE="/etc/nginx/sites-available/${DOMAIN}.conf"
fi

cat > "$NGINX_SITE" << EOF
server {
  listen 80;
  server_name ${DOMAIN};

  root /opt/project/deep-trading-ai/dist;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  location /uploads/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  location / {
    try_files \$uri \$uri/ /index.html;
  }
}
EOF

if [ -d "/etc/nginx/sites-enabled" ]; then
  ln -sf "$NGINX_SITE" "/etc/nginx/sites-enabled/${DOMAIN}.conf"
fi

nginx -t

# 步骤8：重载Nginx
systemctl reload nginx

# 步骤9：验证
echo -e "\n✅ 部署完成！验证结果："
grep -rn "localhost:3001" dist --include="*.js" || echo "✅ 前端无硬编码localhost:3001"
cat .env.local | grep Tongyiqianwen_API_KEY && echo "✅ 后端.env.local配置完成"
if command -v ss >/dev/null 2>&1; then
  ss -tlnp | grep ':3001' && echo "✅ 后端3001端口已启动"
else
  netstat -tlnp | grep 3001 && echo "✅ 后端3001端口已启动"
fi
echo -e "\n🎉 部署成功！访问你的域名/IP即可使用。"