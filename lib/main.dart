import 'package:flutter/material.dart';
import 'package:flutter_list_cycle_widget/list_cycle_widget.dart';

void main() => runApp(new MyApp());

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return new MaterialApp(
      title: 'List Cycle Widget Demo',
      theme: new ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: new MyHomePage(title: 'List Cycle Widget Demo Home Page'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  MyHomePage({Key key, this.title}) : super(key: key);

  final String title;

  @override
  _MyHomePageState createState() => new _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {


  @override
  Widget build(BuildContext context) {
    return new Scaffold(
      appBar: new AppBar(
        title: new Text(widget.title),
      ),
      body: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              new Container(
                decoration: new BoxDecoration(
                  color: Colors.blue,
                  borderRadius: new BorderRadius.circular(8.0),
                ),
                child: new ListCycleWidget(
                  widgetList: _sampleWidgetList(),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }


  List<Widget> _sampleWidgetList() {
    List<Widget> sampleList = [];
    for(int i = 0; i < 4; i++) {
      sampleList.add(new Container(
        child: new Padding(
          padding: const EdgeInsets.all(8.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              new Text('$i',
                textAlign: TextAlign.center,
                style: new TextStyle(
                    color: Colors.white,
                    fontSize: 50.0,
                    fontWeight: FontWeight.bold
                ),
              ),
            ],
          ),
        ),
      ));
    }
    return sampleList;
  }
}
