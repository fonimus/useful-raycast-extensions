for extension in github vault
do
  cd $extension && npm run build && cd -
done
