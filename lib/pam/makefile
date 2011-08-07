CFLAGS += -Werror -Wall
MODULE_NAME="mypam.so"

all: ${MODULE_NAME}

clean:
	$(RM) $(MODULE_NAME) *.o

${MODULE_NAME}: http-auth.c
	$(CC) $(CFLAGS) -fPIC -shared -Xlinker -x -o $@ $< -lcurl
