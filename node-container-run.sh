VERSION_FROM_PACKAGE_JSON=$(cat package.json|grep version|head -1|awk -F: '{ print $2 }'|sed 's/[", ]//g')
docker run --rm -d -p 3001:3001/tcp budget-node:$VERSION_FROM_PACKAGE_JSON