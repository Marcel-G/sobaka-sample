# Wip deploy notes

https://github.com/jottenlips/rust-rocket-ecs/tree/main


Building on M1:
```
docker buildx build --platform=linux/amd64 -t sobaka-libp2p-bootstrap .
```


login to ecr:
```
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 366447740649.dkr.ecr.us-east-1.amazonaws.com
```

build and push:
```
docker build -t sobaka-libp2p-bootstrap
```

<!-- docker buildx build --platform=linux/amd64 -t sobaka-libp2p-bootstrap . -->


Tag and push:
```
docker tag sobaka-libp2p-bootstrap 366447740649.dkr.ecr.us-east-1.amazonaws.com/sobaka-next-libp2p-ecr
```
```
docker push 366447740649.dkr.ecr.us-east-1.amazonaws.com/sobaka-next-libp2p-ecr
```
