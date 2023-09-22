# Wip deploy notes

https://github.com/jottenlips/rust-rocket-ecs/tree/main


Building on M1:
```
docker buildx build --platform=linux/amd64 -t sobaka-webrtc-relay .
```


login to ecr:
```
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 366447740649.dkr.ecr.us-east-1.amazonaws.com
```

build and push:
```
docker build -t sobaka-webrtc-relay
```


Tag and push:
```
docker tag sobaka-webrtc-relay 366447740649.dkr.ecr.us-east-1.amazonaws.com/webrtc-relay-ecr
```
```
docker push 366447740649.dkr.ecr.us-east-1.amazonaws.com/webrtc-relay-ecr
```

```
aws ssm start-session --target i-0e34bd5cc2bd7bea0 --region us-east-1
```

On the server:

```
aws ecr get-login-password --region us-east-1 | sudo docker login --username AWS --password-stdin 366447740649.dkr.ecr.us-east-1.amazonaws.com

sudo docker pull 366447740649.dkr.ecr.us-east-1.amazonaws.com/webrtc-relay-ecr

sudo docker run -p 9090:9090/udp -p 9091:9091/udp -d 366447740649.dkr.ecr.us-east-1.amazonaws.com/webrtc-relay-ecr:latest
```

