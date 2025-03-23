from flask import Blueprint, jsonify, request
from app.models import db, Match, Player, Character, Stage
from sqlalchemy import func
from datetime import datetime, timedelta

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/unique-stats', methods=['GET'])
def get_unique_stats():
    # Get unique counts
    unique_players = Player.query.count()
    unique_characters = Character.query.count()
    unique_stages = Stage.query.count()
    
    # Get date range
    first_match = Match.query.order_by(Match.datetime.asc()).first()
    last_match = Match.query.order_by(Match.datetime.desc()).first()
    
    date_range = {
        'start': first_match.datetime.isoformat() if first_match else None,
        'end': last_match.datetime.isoformat() if last_match else None
    }
    
    return jsonify({
        'unique_players': unique_players,
        'unique_characters': unique_characters,
        'unique_stages': unique_stages,
        'date_range': date_range
    })

@analytics_bp.route('/daily-stats', methods=['GET'])
def get_daily_stats():
    # Get daily statistics
    daily_stats = db.session.query(
        func.date(Match.datetime).label('date'),
        func.count(Match.id).label('matches'),
        func.count(func.distinct(Match.shayne_character_id)).label('unique_characters_shayne'),
        func.count(func.distinct(Match.matt_character_id)).label('unique_characters_matt'),
        func.count(func.distinct(Match.stage_id)).label('unique_stages')
    ).group_by(func.date(Match.datetime))\
     .order_by(func.date(Match.datetime).desc())\
     .all()
    
    return jsonify([{
        'date': stat.date.isoformat(),
        'matches': stat.matches,
        'unique_characters_shayne': stat.unique_characters_shayne,
        'unique_characters_matt': stat.unique_characters_matt,
        'unique_stages': stat.unique_stages
    } for stat in daily_stats])

@analytics_bp.route('/character-usage', methods=['GET'])
def get_character_usage():
    # Get character usage statistics
    character_stats = db.session.query(
        Character.name,
        func.count(Match.id).label('total_usage'),
        func.count(func.distinct(Match.shayne_id)).label('unique_players_shayne'),
        func.count(func.distinct(Match.matt_id)).label('unique_players_matt')
    ).outerjoin(Match, (Character.id == Match.shayne_character_id) | (Character.id == Match.matt_character_id))\
     .group_by(Character.name)\
     .order_by(func.count(Match.id).desc())\
     .all()
    
    return jsonify([{
        'character': stat.name,
        'total_usage': stat.total_usage,
        'unique_players_shayne': stat.unique_players_shayne,
        'unique_players_matt': stat.unique_players_matt
    } for stat in character_stats])

@analytics_bp.route('/stage-usage', methods=['GET'])
def get_stage_usage():
    # Get stage usage statistics
    stage_stats = db.session.query(
        Stage.name,
        func.count(Match.id).label('total_usage'),
        func.count(func.distinct(Match.shayne_character_id)).label('unique_characters_shayne'),
        func.count(func.distinct(Match.matt_character_id)).label('unique_characters_matt')
    ).outerjoin(Match, Stage.id == Match.stage_id)\
     .group_by(Stage.name)\
     .order_by(func.count(Match.id).desc())\
     .all()
    
    return jsonify([{
        'stage': stat.name,
        'total_usage': stat.total_usage,
        'unique_characters_shayne': stat.unique_characters_shayne,
        'unique_characters_matt': stat.unique_characters_matt
    } for stat in stage_stats])

@analytics_bp.route('/player-stats', methods=['GET'])
def get_player_stats():
    # Get player statistics
    player_stats = db.session.query(
        Player.name,
        func.count(Match.id).label('total_matches'),
        func.count(func.distinct(Match.shayne_character_id)).label('unique_characters'),
        func.count(func.distinct(Match.stage_id)).label('unique_stages')
    ).outerjoin(Match, (Player.id == Match.shayne_id) | (Player.id == Match.matt_id))\
     .group_by(Player.name)\
     .all()
    
    return jsonify([{
        'player': stat.name,
        'total_matches': stat.total_matches,
        'unique_characters': stat.unique_characters,
        'unique_stages': stat.unique_stages
    } for stat in player_stats]) 