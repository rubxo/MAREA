import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { PropsWithChildren, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme/tokens';

type AuthScaffoldProps=PropsWithChildren<{eyebrow:string;title:string;description:string;compact?:boolean}>;
export function AuthScaffold({eyebrow,title,description,children,compact=false}:AuthScaffoldProps){
 return <View style={styles.screen}><StatusBar style="light" />
 <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1}}>
 <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{flexGrow:1}} showsVerticalScrollIndicator={false}>
  <View style={[styles.hero,compact&&{minHeight:215}]}>
    <Image source={{uri:'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=1200&q=85'}} contentFit="cover" style={StyleSheet.absoluteFill} cachePolicy="memory-disk" accessible={false}/>
    <View style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(12,35,58,0.65)'}]}/>
    <SafeAreaView edges={['top']} style={{flex:1}}>
     <View style={styles.brandRow}><View style={styles.brandMark}><Feather name="aperture" color="#C3F3EB" size={27}/></View><Text style={styles.brand}>marea</Text><View style={{flex:1}}/><Text style={styles.brandNote}>Encuentra tu corriente.</Text></View>
     <View style={styles.heroCopy}><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.heroTitle}>{compact?'Hazlo tuyo.':'La vida merece\notra mirada.'}</Text></View>
    </SafeAreaView>
  </View>
  <View style={styles.sheet}>
   <View style={styles.handle}/>
   <Text style={styles.title}>{title}</Text>
   <Text style={styles.description}>{description}</Text>
   <View style={styles.form}>{children}</View>
   <View style={styles.privacy}><Feather name="lock" size={13} color={colors.mutedInk}/><Text style={styles.privacyText}>Tu espacio. Tus personas. Tú decides qué compartir.</Text></View>
  </View>
 </ScrollView></KeyboardAvoidingView></View>;
}
type FormFieldProps=TextInputProps&Readonly<{label:string;hint?:string}>;
export function FormField({label,hint,secureTextEntry,onFocus,onBlur,style,...props}:FormFieldProps){
 const [visible,setVisible]=useState(false),[focused,setFocused]=useState(false);
 return <View style={{gap:7}}><Text style={styles.label}>{label}</Text>
 <View style={[styles.inputWrap,focused&&styles.focused]}>
 <TextInput {...props} accessibilityLabel={props.accessibilityLabel??label}
  secureTextEntry={secureTextEntry&&!visible} placeholderTextColor="#8798A7" selectionColor={colors.coral}
  onFocus={event=>{setFocused(true);onFocus?.(event);}} onBlur={event=>{setFocused(false);onBlur?.(event);}}
  style={[styles.input,style]}/>
 {secureTextEntry?<Pressable accessibilityRole="button" accessibilityLabel={visible?'Ocultar contraseña':'Mostrar contraseña'} onPress={()=>setVisible(!visible)} style={styles.eye}><Feather name={visible?'eye-off':'eye'} size={19} color={colors.mutedInk}/></Pressable>:null}
 </View>{hint?<Text style={styles.hint}>{hint}</Text>:null}</View>;
}
export function PrimaryButton({label,loading,disabled,onPress}:{label:string;loading?:boolean;disabled?:boolean;onPress():void}){
 return <Pressable accessibilityRole="button" accessibilityState={{disabled:disabled||loading,busy:loading}} disabled={disabled||loading} onPress={onPress}
 style={({pressed})=>[styles.primary,(disabled||loading)&&{opacity:0.45},pressed&&{opacity:0.8,transform:[{scale:0.985}]}]}>
 {loading?<ActivityIndicator color="white"/>:null}<Text style={styles.primaryText}>{label}</Text>{!loading?<Feather name="arrow-right" size={19} color="white"/>:null}
 </Pressable>;
}
export function FormMessage({tone,children}:PropsWithChildren<{tone:'error'|'success'}>){
 return <View accessibilityRole="alert" style={[styles.message,{backgroundColor:tone==='error'?'#FDEDF0':'#E7F5EE'}]}>
 <Feather name={tone==='error'?'alert-circle':'check-circle'} size={17} color={tone==='error'?colors.danger:colors.success}/>
 <Text style={{flex:1,fontSize:12,lineHeight:18,color:tone==='error'?colors.danger:colors.success}}>{children}</Text></View>;
}
const styles=StyleSheet.create({
 screen:{flex:1,backgroundColor:colors.ink},hero:{minHeight:290,backgroundColor:'#1E5467',overflow:'hidden'},
 brandRow:{flexDirection:'row',alignItems:'center',paddingHorizontal:24,paddingTop:15,gap:9},
 brandMark:{height:40,width:40,alignItems:'center',justifyContent:'center',borderRadius:15,backgroundColor:'#FFFFFF15'},
 brand:{fontFamily:'Inter_800ExtraBold',fontSize:29,letterSpacing:-1.5,color:'white'},
 brandNote:{fontSize:10,color:'#D2E7EC',maxWidth:92,lineHeight:15,textAlign:'right'},
 heroCopy:{paddingHorizontal:28,paddingTop:35,paddingBottom:48},
 eyebrow:{fontFamily:'Inter_500Medium',color:'#BBEADF',fontSize:12,marginBottom:12},
 heroTitle:{fontFamily:'Inter_800ExtraBold',fontSize:38,lineHeight:42,letterSpacing:-1.7,color:'white'},
 sheet:{backgroundColor:colors.surface,borderTopLeftRadius:32,borderTopRightRadius:32,marginTop:-30,paddingHorizontal:28,paddingBottom:34,paddingTop:14,flex:1},
 handle:{width:32,height:4,backgroundColor:colors.hairline,alignSelf:'center',borderRadius:3,marginBottom:25},
 title:{fontFamily:'Inter_700Bold',fontSize:25,color:colors.ink,letterSpacing:-0.8},
 description:{fontSize:13,lineHeight:20,color:colors.mutedInk,marginTop:7,maxWidth:450},
 form:{gap:17,marginTop:25},label:{fontFamily:'Inter_600SemiBold',fontSize:12,color:colors.ink},
 inputWrap:{flexDirection:'row',alignItems:'center',borderRadius:14,borderWidth:1,borderColor:colors.hairline,backgroundColor:colors.paper},
 focused:{borderColor:colors.deepBlue,backgroundColor:'white'},
 input:{flex:1,minHeight:54,paddingHorizontal:15,color:colors.ink,fontFamily:'Inter_400Regular',fontSize:14},
 eye:{width:46,height:48,alignItems:'center',justifyContent:'center'},hint:{color:colors.mutedInk,fontSize:11,lineHeight:16},
 primary:{minHeight:54,borderRadius:16,backgroundColor:colors.coral,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:15},
 primaryText:{fontFamily:'Inter_700Bold',fontSize:14,color:'white'},
 message:{flexDirection:'row',padding:13,borderRadius:13,gap:8},
 privacy:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,marginTop:27},
 privacyText:{fontSize:10,color:colors.mutedInk,flexShrink:1}
});
