# if the data folder doesn't exist, create it
if [ ! -d "data" ]; then
  mkdir data
fi

# run npm install in the root directory
npm install

# loop through each subfolder in modules/ and run npm install
for d in modules/*/ ; do
  cd $d
  npm install
  cd ../..
done
