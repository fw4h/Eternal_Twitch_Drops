setThrowException(False)
while True:
    if exists("bronzedrop.PNG"):
        hover("bronzedrop.PNG")
        wait(2)
        doubleClick()
    if exists(Pattern("silverdrop.PNG").similar(0.50)):
        hover(Pattern("silverdrop-1.PNG").similar(0.50))
        wait(2)
        doubleClick()
    if not Region(0,73,59,58).exists("1544480537332.png"):
        wait(3)
        if not Region(0,73,59,58).exists("1544480537332.png"):
            hover(Location(51, 16))
            wait(2)
            click(Location(51, 16))
            hover("1544364981762.png")
            wait(2)
            click()
            




