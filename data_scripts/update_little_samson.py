import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'collector.db')

def update_game():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    description = "The Imperial Forgy has been invaded by Ta-Keed the Prince of Darkness! Only the owners of the Magic Bells can stop his forces from destroying the realm. Led by the mountaineering youth, Samson, a force of unlikely heroes sets out to banish evil forever! Become a fire-breathing dragon, a living statue of solid stone or a nimble and crafty mouse. Soar the skies and belch fire balls as Kikira the Dragon Lord! Crush enemy troops with fists of granite as Gamm the Rock Lord! Scurry past dangerous monsters while setting time bombs as K.O. the mouse! These creatures join Little Samson to form a unique and powerful alliance as the last hope for the Imperial Forgy!"
    
    sql = """
    UPDATE products 
    SET description = ?, 
        publisher = ?, 
        developer = ?, 
        esrb_rating = ?, 
        players = ?,
        genre = ?
    WHERE id = 33927
    """
    
    cursor.execute(sql, (description, "Taito Corporation", "Takeru", "none", "1 player", "Action & Adventure"))
    conn.commit()
    print(f"Updated Little Samson (ID 33927). Rows affected: {cursor.rowcount}")
    conn.close()

if __name__ == "__main__":
    update_game()
