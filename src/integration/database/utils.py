import datetime
import json
import uuid

from sqlalchemy import text
from sqlalchemy.orm import Session


class DateUUIDEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, uuid.UUID):
            # if the obj is uuid, we simply return the value of uuid
            return str(obj)
        if isinstance(obj, datetime.datetime):
            # if the obj is datetime cast to iso
            return obj.isoformat()
        return json.JSONEncoder.default(self, obj)
