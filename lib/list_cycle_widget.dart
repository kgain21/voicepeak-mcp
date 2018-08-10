
import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_list_cycle_widget/animated_box.dart';

class ListCycleWidget extends StatefulWidget {
  ListCycleWidget({Key key, this.widgetList}) : super(key: key);

  final List<Widget> widgetList;

  @override
  State<StatefulWidget> createState() {
    return new _ListCycleWidgetState(widgetList: widgetList);
  }

}

class _ListCycleWidgetState extends State<ListCycleWidget> with TickerProviderStateMixin {
  _ListCycleWidgetState({this.widgetList}) : super();

  final List<Widget> widgetList;
  final List<AnimationController> _controllerList = [];

  Future _startAnimation() async {
    try {
      while (true) {
          for(int i = 0; i < _controllerList.length; i++) {
            await _controllerList[i].forward().orCancel;
            await _controllerList[i].reverse().orCancel;
          }
      }
    } on TickerCanceled {
      print('Animation Failed.');
    }
  }

  @override
  void initState() {
    super.initState();

    widgetList.forEach((i) {
      _controllerList.add(
        new AnimationController(
          vsync: this,
          duration: const Duration(seconds: 3)
        )
      );
    });

    _startAnimation();
  }

  @override
  Widget build(BuildContext context) {
    return new Stack(
      children: createAnimatedBoxes(),
    );
  }

  List<Widget> createAnimatedBoxes() {

    List<Widget> animatedBoxesList = [];

    for(int i = 0; i < _controllerList.length; i++) {
      animatedBoxesList.add(
          new AnimatedBox(
            container: new Container(
              child: widgetList[i],
            ),
            controller: _controllerList[i].view,
          )
      );
    }

    return animatedBoxesList;
  }

  dispose() {
    _controllerList.forEach((i) {
      i?.dispose();
    });
    super.dispose();
  }
}
