#!/bin/bash
profiles=( "car" "bicycle" "foot" )

# download region
wget http://download.geofabrik.de/europe/germany/bayern-latest.osm.pbf map.osm.pbf

for profile in "${profiles[@]}"
do
  # run preprocessing for car
  docker run -t -v $(pwd):/data osrm/osrm-backend osrm-extract -p /opt/$profile.lua /data/map.osm.pbf
  docker run -t -v $(pwd):/data osrm/osrm-backend osrm-partition /data/map.osrm
  docker run -t -v $(pwd):/data osrm/osrm-backend osrm-customize /data/map.osrm

  # zip relevant files
  mkdir $profile
  mv ./*osrm* ./$profile/
  tar -zcvf $profile.tar.gz ./$profile

  # copy files to server
  scp $profile.tar.gz root@floschnell.de:/opt/osm/

  # unpack files on server
  ssh root@floschnell.de "tar -zcvf $profile.tar.gz"
done
