
import 'package:flutter/widgets.dart';

class AnimatedBox extends StatelessWidget {
  AnimatedBox({Key key, this.controller, this.container}) :
        opacity = Tween<double>(
          begin: 0.0,
          end: 1.0,
        ).animate(
          CurvedAnimation(
            parent: controller,
            curve: Interval(
              0.0,
              1.0,
              curve: Curves.ease,
            ),
          ),
        ),
        super(key: key);

  final Animation<double> controller;
  final Animation<double> opacity;
  final Container container;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (BuildContext context, Widget child) {
        return Opacity(
          opacity: opacity.value,
          child: Container(
            alignment: Alignment.center,
            child: container,
          ),
        );
      },
    );
  }
}
