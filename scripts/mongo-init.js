// MongoDB Initialization Script
// Creates the bcv_user with read/write permissions on bcvdb database

db = db.getSiblingDB('bcvdb');

// Create bcv_user with readWrite role
db.createUser({
  user: 'bcv_user',
  pwd: 'bcv4r4y4r4y',
  roles: [
    {
      role: 'readWrite',
      db: 'bcvdb'
    }
  ]
});

print('MongoDB user "bcv_user" created successfully with readWrite permissions on "bcvdb" database');
