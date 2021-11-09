#! /bin/bash
docker login -u $DOCKER_USER -p $DOCKER_PASS
export REPO=qcifengineering/redbox-portal
export TAG=`if [ "$CIRCLE_BRANCH" == "master" ] && [ -z "$1" ]; then echo "latest"; else echo "$CIRCLE_BRANCH"; fi`
if [ -z "$CIRCLE_BRANCH" ]; then
        export TAG="$CIRCLE_TAG";
fi;
#if parameter is passed to script, add parameter to tag. Used to produce bcryptjs versions of the app
export TAG=`echo "v2.0.4-dev"`
docker build -f Dockerfile -t $REPO:$CIRCLE_SHA1 .
docker tag $REPO:$CIRCLE_SHA1 $REPO:$TAG
docker tag $REPO:$CIRCLE_SHA1 $REPO:circleci-$CIRCLE_BUILD_NUM
docker push $REPO:$TAG
docker push $REPO:$CIRCLE_SHA1
docker push $REPO:circleci-$CIRCLE_BUILD_NUM
if [ "$CIRCLE_BRANCH" == "master" ]; then
   docker tag $REPO:$CIRCLE_SHA1 $REPO:master
   docker push $REPO:master
fi
