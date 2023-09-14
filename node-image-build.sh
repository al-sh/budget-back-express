VERSION_FROM_PACKAGE_JSON=$(cat package.json|grep version|head -1|awk -F: '{ print $2 }'|sed 's/[", ]//g')
docker build -f deploy/back-Dockerfile -t budget-node:$VERSION_FROM_PACKAGE_JSON .
