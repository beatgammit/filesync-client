CFLAGS += -Werror -Wall
OUT_PATH="http-auth.so"
DIR="./"

all: ${OUT_PATH}

clean:
	$(RM) $(OUT_PATH) *.o

${OUT_PATH}: ${DIR}http-auth.c
	$(CC) $(CFLAGS) -fPIC -shared -Xlinker -x -o $@ $< -lcurl
