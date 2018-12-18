setThrowException(False)
while True:
    if exists("bronzedrop.PNG"):
        click("bronzedrop.PNG")
    if exists(Pattern("silverdrop.PNG").similar(0.50)):
        click(Pattern("silverdrop-1.PNG").similar(0.50))
    if not Region(0,73,59,58).exists("1544480537332.png"):
        wait(30)
        if not Region(0,73,59,58).exists("1544480537332.png"):
            click(Location(51, 16))
            click("1544364981762.png")




