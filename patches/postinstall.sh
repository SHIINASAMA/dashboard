#!/bin/bash
# Fix: twitter-openapi-typescript-generated Entities.js - missing null check on urls
ENTITIES="node_modules/twitter-openapi-typescript-generated/dist/models/Entities.js"
if [ -f "$ENTITIES" ]; then
  sed -i '' "s/'urls': (json\['urls'\].map(Url_1.UrlFromJSON))/'urls': json['urls'] == null ? undefined : (json['urls'].map(Url_1.UrlFromJSON))/" "$ENTITIES"
  sed -i '' "s/'urls': (value\['urls'\].map(Url_1.UrlToJSON))/'urls': value['urls'] == null ? undefined : (value['urls'].map(Url_1.UrlToJSON))/" "$ENTITIES"
  echo "Patched Entities.js"
fi

EXTENDED="node_modules/twitter-openapi-typescript-generated/dist/models/ExtendedEntities.js"
if [ -f "$EXTENDED" ]; then
  sed -i '' "s/'media': (json\['media'\].map(MediaExtended_1.MediaExtendedFromJSON))/'media': json['media'] == null ? undefined : (json['media'].map(MediaExtended_1.MediaExtendedFromJSON))/" "$EXTENDED"
  sed -i '' "s/'media': (value\['media'\].map(MediaExtended_1.MediaExtendedToJSON))/'media': value['media'] == null ? undefined : (value['media'].map(MediaExtended_1.MediaExtendedToJSON))/" "$EXTENDED"
  echo "Patched ExtendedEntities.js"
fi
