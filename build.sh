for extension in `ls -d */`
do
  cd $extension && npm run build && cd -
done
