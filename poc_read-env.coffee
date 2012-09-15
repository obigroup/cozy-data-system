cradle = require 'cradle'

setup_credentials = ->
    #default credentials
    credentials = {
        host : 'localhost',
        port : '5984',
        cache : true,
        raw: false
        db: 'cozy'
    }


    # credentials retrieved by environment variable
    if process.env.VCAP_SERVICES?
        env = JSON.parse process.env.VCAP_SERVICES
        couch = env['couchdb-1.2.0'][0]['credentials']
        credentials.hostname = couch.hostname ? 'localhost'
        credentials.host = couch.host ? '127.0.0.1'
        credentials.port = couch.port ? '5984'
        credentials.db = couch.db ? 'cozy'
        if couch.username? and couch.password?
            credentials.auth = \
                    {username: couch.username, password: couch.password}

    return credentials

#console.log JSON.stringify setup_credentials(), null, 4

connect_db = ->
    credentials = setup_credentials()
    connection = new cradle.Connection credentials
    db = connection.database credentials.db
    return db

db = connect_db()
#console.log JSON.stringify db, null, 4

#---------------------------------------

db.exists (err, exists) ->
    if err?
        console.log "err: ", err
    else if exists
        console.log "database #{db.name} on #{db.connection.host}:#{db.connection.port} found"
    else
        console.log "database #{db.name} on #{db.connection.host}:#{db.connection.port} not found"
        db.create ->
            console.log "database #{db.name} on #{db.connection.host}:#{db.connection.port} created"
            return
