import random

def get_random_word():
    wordlist = ['apple', 'bannana', 'lemon', 'orange', 'kiwi', 'blueberry', 'water', 'coconut', 'lime', 'lychee']
    randword = random.choice(wordlist).upper()
    return randword

def game(targetword): 
    attempts = 6 
    # print(targetword)
    print("welcome to hangman!")
    blanks = []
    guessed_letters = []
    for _ in targetword:
        blanks.append("_")
        print("_", end=' ')
    print("\n")
    while "_" in blanks and attempts>0:
        if attempts == 0: 
            print("Gameover.")
            return 0
        guess = input('Enter letter guess: ').upper()
        if(guess in guessed_letters):
            print("already guessed. try another word")
            continue
        guessed_letters += guess
        for i in range(len(targetword)): 
            letter = targetword[i]
            if guess == letter:
                blanks[i] = letter
        if(guess not in targetword):
            attempts-=1
        print(' '.join(blanks))
    return blanks 


randword = get_random_word()
game(randword)