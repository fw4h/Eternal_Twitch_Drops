setThrowException(False)
while True:
    if exists("bronzedrop.PNG"):
        click("bronzedrop.PNG")
    if exists(Pattern("silverdrop.PNG").similar(0.50)):
        click(Pattern("silverdrop-1.PNG").similar(0.50))
    if not exists ("1544364318562.png"):
        wait(30)
        if not exists ("1544364318562.png"):
            click(Location(51, 16))
            click("1544364981762.png")




