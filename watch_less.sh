#!/bin/bash
# Requires watchr: https://github.com/mynyml/watchr
watchr -e 'watch("(.*)\.less$") { |f| system("echo \"/* generated file */\" > #{f[1]}.css & lessc -x #{f[0]} >> #{f[1]}.css && echo \"#{f[0]} > #{f[1]}.css\" ") }'
