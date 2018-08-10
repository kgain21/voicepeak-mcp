# flutter-list-cycle-widget
__Flutter widget that cycles through a list of widgets with a transition animation.__

* The widget will take a list of widgets that you define, create a controller for each widget, and animate each widget forward and backward to give a smooth transition. 


* For this example, I created a separate widget call AnimatedBox that animates a Tween for opacity. The transition loop will fade each widget from the list in and out, and will repeat once the end of the list is reached. The AnimatedBox only animates opacity, but width, height, and many other properties could be added in for more advanced transitions. I used a basic list of numbers for this example, but more detailed widgets or images could be used as well. 

_I'm always interested in feedback so if you have any questions, comments, or advice please let me know!_


