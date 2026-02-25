# Background server
pm2 start ./dist/index.js --name "antstudio-api"
echo "Background server opened successfully"

# Static file server
#pm2 start files/index.js -i max

#pm2 start files/index.js --name "antstudio-files"
#echo "File server opened successfully"
