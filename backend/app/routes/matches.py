from flask import Blueprint, request, jsonify
from app.models import db, Match, Player, Character, Stage
from datetime import datetime

matches_bp = Blueprint('matches', __name__)

@matches_bp.route('/matches', methods=['POST'])
def create_match():
    data = request.get_json()
    
    # Get or create players
    shayne = Player.query.filter_by(name='Shayne').first()
    matt = Player.query.filter_by(name='Matt').first()
    
    # Get or create characters
    shayne_char = Character.query.filter_by(name=data['shayne_character']).first()
    if not shayne_char:
        shayne_char = Character(name=data['shayne_character'])
        db.session.add(shayne_char)
        db.session.flush()
    
    matt_char = Character.query.filter_by(name=data['matt_character']).first()
    if not matt_char:
        matt_char = Character(name=data['matt_character'])
        db.session.add(matt_char)
        db.session.flush()
    
    # Get or create stage
    stage = None
    if data.get('stage'):
        stage = Stage.query.filter_by(name=data['stage']).first()
        if not stage:
            stage = Stage(name=data['stage'])
            db.session.add(stage)
            db.session.flush()
    
    # Determine winner
    winner = shayne if data['winner'] == 'Shayne' else matt
    
    # Create match
    match = Match(
        datetime=datetime.fromtimestamp(data['timestamp']),
        shayne_id=shayne.id,
        matt_id=matt.id,
        shayne_character_id=shayne_char.id,
        matt_character_id=matt_char.id,
        winner_id=winner.id,
        stocks_remaining=data.get('stocks_remaining'),
        stage_id=stage.id if stage else None,
        match_duration=data.get('match_duration'),
        timestamp=data['timestamp']
    )
    
    db.session.add(match)
    db.session.commit()
    
    return jsonify(match.to_dict()), 201

@matches_bp.route('/matches', methods=['GET'])
def get_matches():
    matches = Match.query.order_by(Match.datetime.desc()).all()
    return jsonify([match.to_dict() for match in matches])

@matches_bp.route('/matches/stats', methods=['GET'])
def get_stats():
    total_matches = Match.query.count()
    shayne_wins = Match.query.filter_by(winner_id=1).count()  # Assuming Shayne's ID is 1
    matt_wins = Match.query.filter_by(winner_id=2).count()    # Assuming Matt's ID is 2
    
    # Get most played characters
    shayne_chars = db.session.query(
        Character.name,
        db.func.count(Match.id).label('count')
    ).join(Match, Match.shayne_character_id == Character.id)\
     .group_by(Character.name)\
     .order_by(db.desc('count'))\
     .limit(5).all()
    
    matt_chars = db.session.query(
        Character.name,
        db.func.count(Match.id).label('count')
    ).join(Match, Match.matt_character_id == Character.id)\
     .group_by(Character.name)\
     .order_by(db.desc('count'))\
     .limit(5).all()
    
    return jsonify({
        'total_matches': total_matches,
        'shayne_wins': shayne_wins,
        'matt_wins': matt_wins,
        'shayne_most_played': [{'character': char.name, 'count': char.count} for char in shayne_chars],
        'matt_most_played': [{'character': char.name, 'count': char.count} for char in matt_chars]
    }) 