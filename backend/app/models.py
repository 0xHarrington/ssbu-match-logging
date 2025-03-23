from datetime import datetime
from app import db

class Player(db.Model):
    __tablename__ = 'players'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    matches_as_shayne = db.relationship('Match', foreign_keys='Match.shayne_id', backref='shayne', lazy=True)
    matches_as_matt = db.relationship('Match', foreign_keys='Match.matt_id', backref='matt', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'created_at': self.created_at.isoformat()
        }

class Character(db.Model):
    __tablename__ = 'characters'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    matches_as_shayne = db.relationship('Match', foreign_keys='Match.shayne_character_id', backref='shayne_character', lazy=True)
    matches_as_matt = db.relationship('Match', foreign_keys='Match.matt_character_id', backref='matt_character', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'created_at': self.created_at.isoformat()
        }

class Stage(db.Model):
    __tablename__ = 'stages'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    matches = db.relationship('Match', backref='stage', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'created_at': self.created_at.isoformat()
        }

class Match(db.Model):
    __tablename__ = 'matches'
    
    id = db.Column(db.Integer, primary_key=True)
    datetime = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    shayne_id = db.Column(db.Integer, db.ForeignKey('players.id'), nullable=False)
    matt_id = db.Column(db.Integer, db.ForeignKey('players.id'), nullable=False)
    shayne_character_id = db.Column(db.Integer, db.ForeignKey('characters.id'), nullable=False)
    matt_character_id = db.Column(db.Integer, db.ForeignKey('characters.id'), nullable=False)
    winner_id = db.Column(db.Integer, db.ForeignKey('players.id'), nullable=False)
    stocks_remaining = db.Column(db.Integer)
    stage_id = db.Column(db.Integer, db.ForeignKey('stages.id'))
    match_duration = db.Column(db.Integer)  # Duration in seconds
    timestamp = db.Column(db.Float, nullable=False)  # Unix timestamp
    
    def to_dict(self):
        return {
            'id': self.id,
            'datetime': self.datetime.isoformat(),
            'shayne': self.shayne.name,
            'matt': self.matt.name,
            'shayne_character': self.shayne_character.name,
            'matt_character': self.matt_character.name,
            'winner': self.winner.name,
            'stocks_remaining': self.stocks_remaining,
            'stage': self.stage.name if self.stage else None,
            'match_duration': self.match_duration,
            'timestamp': self.timestamp
        }
    
    @classmethod
    def from_dict(cls, data):
        # Get or create players
        shayne = Player.query.filter_by(name='Shayne').first()
        matt = Player.query.filter_by(name='Matt').first()
        
        # Get or create characters
        shayne_char = Character.query.filter_by(name=data['shayne_character']).first()
        matt_char = Character.query.filter_by(name=data['matt_character']).first()
        
        # Get or create stage
        stage = None
        if data.get('stage'):
            stage = Stage.query.filter_by(name=data['stage']).first()
        
        # Determine winner
        winner = shayne if data['winner'] == 'Shayne' else matt
        
        return cls(
            shayne_id=shayne.id,
            matt_id=matt.id,
            shayne_character_id=shayne_char.id,
            matt_character_id=matt_char.id,
            winner_id=winner.id,
            stocks_remaining=data.get('stocks_remaining'),
            stage_id=stage.id if stage else None,
            match_duration=data.get('match_duration'),
            timestamp=data.get('timestamp', datetime.utcnow().timestamp())
        ) 