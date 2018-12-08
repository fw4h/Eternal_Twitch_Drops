setThrowException(False)
while True:
    if exists("bronzedrop.PNG"):
        click("bronzedrop.PNG")
    if exists(Pattern("silverdrop.PNG").similar(0.50)):
        click(Pattern("silverdrop-1.PNG").similar(0.50))
        continue
    else:
        continue




